'use strict';

// ====== Configuration ======
const CONFIG = {
  BASE_URL: '', // same-origin. Set to e.g., 'https://your-api-host' if needed
  ENDPOINTS: {
    accounts: '/api/Account',
    statement: (balanceId, fromDate, toDate, pageNumber, pageSize) => `/api/Account/${encodeURIComponent(balanceId)}/${encodeURIComponent(fromDate)}/${encodeURIComponent(toDate)}?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    transaction: (transactionId) => `/api/Account/${encodeURIComponent(transactionId)}`,
  },
  PAGE_SIZE: 200, // Increased from 50 to reduce total pages (139 pages → ~35 pages)
  PARALLEL_BATCH_SIZE: 5, // Reduced to avoid overwhelming slow server
  REQUEST_TIMEOUT: 60000, // 60 seconds timeout per request
  MAX_RETRIES: 2, // Retry failed requests
};

// ====== State ======
const state = {
  accounts: [],
  selectedAccountId: null,
  fromDate: null,
  toDate: null,
  // pagination
  pageNumber: 1,
  totalPages: 0,
  totalRecords: 0,
  loading: false,
  // data accumulation
  rows: [],
  // totals
  totals: {
    prev: 0,
    debit: 0,
    credit: 0,
    final: 0,
    firstPrev: null,
  },
};

// ====== Utilities ======
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseISODate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return dt;
}

function yyyymmdd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function showOverlay(text) {
  $('#overlayText').text(text || 'Loading...');
  $('#overlayLoading').removeClass('d-none');
}

function hideOverlay() {
  $('#overlayLoading').addClass('d-none');
}

function setBtnLoading($btn, $spinner, isLoading) {
  if (isLoading) {
    $spinner.removeClass('d-none');
    $btn.prop('disabled', true);
  } else {
    $spinner.addClass('d-none');
    $btn.prop('disabled', false);
  }
}

function updateRecordsInfo() {
  if (!state.totalRecords) {
    $('#recordsInfo').text('No data loaded');
    return;
  }
  const shown = state.rows.length;
  $('#recordsInfo').text(`Showing ${shown} of ${state.totalRecords} records (page ${state.pageNumber - 1} of ${state.totalPages})`);
}

function resetTableAndTotals() {
  state.rows = [];
  state.totals = { prev: 0, debit: 0, credit: 0, final: 0, firstPrev: null };
  $('#statementTable tbody').empty();
  updateFooterTotals();
  updateSummaryTotals();
  $('#btnLoadMore, #btnLoadAll').prop('disabled', true);
  state.pageNumber = 1;
  state.totalPages = 0;
  state.totalRecords = 0;
  updateRecordsInfo();
}

function updateFooterTotals() {
  $('#ftPrev').text(fmt(state.totals.prev));
  $('#ftDebit').text(fmt(state.totals.debit));
  $('#ftCredit').text(fmt(state.totals.credit));
  $('#ftFinal').text(fmt(state.totals.final));
}

function updateSummaryTotals() {
  $('#statFirstPrev').text(fmt(state.totals.firstPrev ?? 0));
  $('#statDebits').text(fmt(state.totals.debit));
  $('#statCredits').text(fmt(state.totals.credit));
  // Prefer last row's final balance if available; otherwise use computed
  const lastRow = state.rows[state.rows.length - 1];
  const finalBal = lastRow ? lastRow.finalBalance : state.totals.final;
  $('#statFinal').text(fmt(finalBal));
}

function appendRows(rows) {
  const $tbody = $('#statementTable tbody');
  const frag = document.createDocumentFragment();

  rows.forEach(r => {
    // establish first previous balance from the very first row
    if (state.totals.firstPrev === null && r.previousBalance !== undefined && r.previousBalance !== null) {
      state.totals.firstPrev = Number(r.previousBalance) || 0;
    }

    state.totals.prev += Number(r.previousBalance) || 0;
    state.totals.debit += Number(r.debitAmount) || 0;
    state.totals.credit += Number(r.creditAmount) || 0;
    state.totals.final += Number(r.finalBalance) || 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.accountID ?? r.accountId ?? ''}</td>
      <td>${r.accountName ?? ''}</td>
      <td class="text-end">${fmt(r.previousBalance)}</td>
      <td class="text-end">${fmt(r.debitAmount)}</td>
      <td class="text-end">${fmt(r.creditAmount)}</td>
      <td class="text-end">${fmt(r.finalBalance)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary view-tx" data-txid="${r.balanceHisId ?? ''}" title="View details">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8"/>
            <path d="M8 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5"/>
          </svg>
        </button>
      </td>`;
    frag.appendChild(tr);
  });

  $tbody[0].appendChild(frag);
  updateFooterTotals();
  updateSummaryTotals();
}

// ====== API Calls ======
async function apiGet(url, retryCount = 0) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
  
  try {
    const resp = await fetch(CONFIG.BASE_URL + url, { 
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!resp.ok) {
      if (retryCount < CONFIG.MAX_RETRIES && (resp.status >= 500 || resp.status === 429)) {
        console.warn(`Retrying request (${retryCount + 1}/${CONFIG.MAX_RETRIES}): ${url}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // exponential backoff
        return await apiGet(url, retryCount + 1);
      }
      throw new Error(`HTTP ${resp.status}`);
    }
    return await resp.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      if (retryCount < CONFIG.MAX_RETRIES) {
        console.warn(`Request timeout, retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES}): ${url}`);
        return await apiGet(url, retryCount + 1);
      }
      throw new Error('Request timeout - server is taking too long');
    }
    throw err;
  }
}

async function loadAccounts() {
  const data = await apiGet(CONFIG.ENDPOINTS.accounts);
  // data may be array of {accountId, accountName}
  state.accounts = Array.isArray(data) ? data : [];
  initAccountSelect2();
}

async function fetchStatementPage(pageNumber) {
  const { selectedAccountId, fromDate, toDate } = state;
  const url = CONFIG.ENDPOINTS.statement(selectedAccountId, fromDate, toDate, pageNumber, CONFIG.PAGE_SIZE);
  const data = await apiGet(url);
  // expected shape: { success, data: [...], pagination: { pageNumber, pageSize, totalRecords, totalPages } }
  const rows = data?.data ?? [];
  const pagination = data?.pagination ?? {};
  state.pageNumber = (pagination.pageNumber || pageNumber) + 1; // next page index to fetch
  state.totalPages = pagination.totalPages || state.totalPages || 0;
  state.totalRecords = pagination.totalRecords || state.totalRecords || rows.length;
  return rows;
}

// Optimized: Fetch multiple pages in parallel
async function fetchStatementPageBatch(pageNumbers) {
  const { selectedAccountId, fromDate, toDate } = state;
  const promises = pageNumbers.map(async (pageNum) => {
    const url = CONFIG.ENDPOINTS.statement(selectedAccountId, fromDate, toDate, pageNum, CONFIG.PAGE_SIZE);
    try {
      const data = await apiGet(url);
      return { pageNum, rows: data?.data ?? [], pagination: data?.pagination };
    } catch (err) {
      console.error(`Failed to fetch page ${pageNum}:`, err);
      return { pageNum, rows: [], pagination: null };
    }
  });
  return await Promise.all(promises);
}

// Optimized: Fetch all remaining pages in parallel batches
async function fetchAllPagesOptimized(startPage, totalPages, onProgress) {
  const allRows = [];
  const pagesToFetch = [];
  
  for (let p = startPage; p <= totalPages; p++) {
    pagesToFetch.push(p);
  }
  
  const startTime = Date.now();
  let completedPages = 0;
  
  // Process in batches for better performance and to avoid overwhelming the server
  for (let i = 0; i < pagesToFetch.length; i += CONFIG.PARALLEL_BATCH_SIZE) {
    const batch = pagesToFetch.slice(i, i + CONFIG.PARALLEL_BATCH_SIZE);
    const batchStartTime = Date.now();
    
    const batchResults = await fetchStatementPageBatch(batch);
    
    const batchDuration = (Date.now() - batchStartTime) / 1000;
    completedPages += batch.length;
    
    // Sort by page number to maintain order
    batchResults.sort((a, b) => a.pageNum - b.pageNum);
    
    // Collect all rows
    batchResults.forEach(result => {
      if (result.rows.length > 0) {
        allRows.push(...result.rows);
      }
    });
    
    // Update progress with time estimate
    if (onProgress) {
      const loaded = Math.min(i + CONFIG.PARALLEL_BATCH_SIZE, pagesToFetch.length);
      const avgTimePerBatch = (Date.now() - startTime) / (i / CONFIG.PARALLEL_BATCH_SIZE + 1) / 1000;
      const remainingBatches = Math.ceil((pagesToFetch.length - loaded) / CONFIG.PARALLEL_BATCH_SIZE);
      const estimatedTimeLeft = Math.ceil(avgTimePerBatch * remainingBatches);
      
      onProgress(loaded, pagesToFetch.length, estimatedTimeLeft, batchDuration);
    }
  }
  
  return allRows;
}

async function fetchTransactionDetails(txId) {
  if (!txId) throw new Error('Missing transaction id');
  return await apiGet(CONFIG.ENDPOINTS.transaction(txId));
}

// ====== UI Init ======
function initAccountSelect2() {
  const data = state.accounts.map(a => ({ id: a.accountId, text: `${a.accountId} - ${a.accountName}` }));
  $('#accountSelect').empty();
  $('#accountSelect').select2({
    data,
    placeholder: 'Select account...',
    allowClear: true,
    width: 'resolve',
  });
}

function initDatePickers() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  state.fromDate = yyyymmdd(start);
  state.toDate = yyyymmdd(today);

  flatpickr('#fromDate', {
    dateFormat: 'Y-m-d',
    defaultDate: state.fromDate,
    onChange: (sel) => { if (sel[0]) state.fromDate = yyyymmdd(sel[0]); },
  });
  flatpickr('#toDate', {
    dateFormat: 'Y-m-d',
    defaultDate: state.toDate,
    onChange: (sel) => { if (sel[0]) state.toDate = yyyymmdd(sel[0]); },
  });
}

function bindEvents() {
  $('#accountSelect').on('change', function () {
    state.selectedAccountId = $(this).val();
  });

  $('#btnSearch').on('click', async function () {
    await runSearch();
  });

  $('#btnLoadMore').on('click', async function () {
    await loadNextPage();
  });

  $('#btnLoadAll').on('click', async function () {
    const remainingPages = state.totalPages - (state.pageNumber - 1);
    if (remainingPages > 20) {
      const estimatedMinutes = Math.ceil((remainingPages / CONFIG.PARALLEL_BATCH_SIZE) * 30 / 60); // Assume 30s per batch
      const confirmed = confirm(
        `Warning: You have ${remainingPages} pages remaining.\n\n` +
        `Estimated time: ~${estimatedMinutes} minute(s)\n\n` +
        `This may take a while. Continue?\n\n` +
        `Tip: Use "Export to Excel" instead - it's optimized for large datasets.`
      );
      if (!confirmed) return;
    }
    await loadAllRemaining();
  });

  $('#statementTable').on('click', '.view-tx', async function () {
    const txId = $(this).data('txid');
    await openTxModal(txId);
  });

  $('#btnPrint').on('click', async function () {
    await printCurrent();
  });

  $('#btnExport').on('click', async function () {
    await exportCsv();
  });

  $('#btnYTD').on('click', async function () {
    await printYTD();
  });
}

// ====== Actions ======
async function runSearch() {
  if (!state.selectedAccountId) {
    alert('Please select an account.');
    return;
  }
  setBtnLoading($('#btnSearch'), $('#searchSpinner'), true);
  try {
    resetTableAndTotals();
    // first page load only for fast initial paint
    const rows = await fetchStatementPage(1);
    state.rows.push(...rows);
    appendRows(rows);
    updateRecordsInfo();
    updatePagingButtons();
  } catch (err) {
    console.error(err);
    alert('Failed to load statement.');
  } finally {
    setBtnLoading($('#btnSearch'), $('#searchSpinner'), false);
  }
}

function updatePagingButtons() {
  const moreRemaining = state.pageNumber - 1 < state.totalPages;
  $('#btnLoadMore, #btnLoadAll').prop('disabled', !moreRemaining);
}

async function loadNextPage() {
  if (state.loading) return;
  state.loading = true;
  try {
    const rows = await fetchStatementPage(state.pageNumber);
    state.rows.push(...rows);
    appendRows(rows);
    updateRecordsInfo();
    updatePagingButtons();
  } catch (e) {
    console.error(e);
    alert('Failed to load more data');
  } finally {
    state.loading = false;
  }
}

async function loadAllRemaining(progressText) {
  if (state.loading) return;
  state.loading = true;
  showOverlay(progressText || 'Loading all pages...');
  try {
    const startPage = state.pageNumber;
    const totalPages = state.totalPages;
    
    if (startPage > totalPages) {
      updatePagingButtons();
      return;
    }
    
    // Fetch all remaining pages in parallel batches
    const allRows = await fetchAllPagesOptimized(startPage, totalPages, (loaded, total, estimatedTimeLeft, batchDuration) => {
      let msg = `${progressText || 'Loading all pages...'} (${loaded}/${total})`;
      if (estimatedTimeLeft) {
        msg += ` - Est. ${estimatedTimeLeft}s remaining`;
      }
      if (batchDuration) {
        msg += ` (Last batch: ${batchDuration.toFixed(1)}s)`;
      }
      $('#overlayText').text(msg);
    });
    
    // Append all rows at once for better performance
    state.rows.push(...allRows);
    appendRows(allRows);
    
    // Update state
    state.pageNumber = totalPages + 1;
    updateRecordsInfo();
    updatePagingButtons();
  } catch (e) {
    console.error(e);
    alert('Failed to load all data');
  } finally {
    state.loading = false;
    hideOverlay();
  }
}

async function openTxModal(txId) {
  if (!txId) return;
  showOverlay('Loading transaction...');
  try {
    const data = await fetchTransactionDetails(txId);
    // Populate modal
    $('#txRequestNo').text(data.requestNo ?? '-');
    $('#txKind').text(data.kind ?? '-');
    $('#txDebtor').text(fmt(data.debtor));
    $('#txCreditor').text(fmt(data.creditor));
    $('#txPrev').text(fmt(data.prevBalnce ?? data.prevBalance));
    $('#txNew').text(fmt(data.newBalnce ?? data.newBalance));
    const dt = parseISODate(data.date);
    $('#txDate').text(dt ? dt.toLocaleString() : '-');
    $('#txOrder').text(data.orderBill ?? '-');
    $('#txRemarks').html(data.remarks ?? '-');

    const modal = new bootstrap.Modal(document.getElementById('txModal'));
    modal.show();
  } catch (e) {
    console.error(e);
    alert('Failed to load transaction details');
  } finally {
    hideOverlay();
  }
}

async function printCurrent() {
  setBtnLoading($('#btnPrint'), $('#printSpinner'), true);
  showOverlay('Preparing print...');
  try {
    // Ensure at least current page is loaded; optionally load all for complete print
    await loadAllRemaining('Loading all pages for print...');
    window.print();
  } finally {
    hideOverlay();
    setBtnLoading($('#btnPrint'), $('#printSpinner'), false);
  }
}

async function exportCsv() {
  setBtnLoading($('#btnExport'), $('#exportSpinner'), true);
  showOverlay('Preparing export...');
  try {
    let exportRows = [];
    
    // If we haven't loaded all pages yet, fetch them optimized (without DOM rendering)
    if (state.pageNumber - 1 < state.totalPages) {
      const startPage = state.pageNumber;
      const totalPages = state.totalPages;
      
      // Fetch remaining pages in parallel
      const remainingRows = await fetchAllPagesOptimized(startPage, totalPages, (loaded, total, estimatedTimeLeft) => {
        let msg = `Fetching data for export... (${loaded}/${total} pages)`;
        if (estimatedTimeLeft) {
          msg += ` - Est. ${estimatedTimeLeft}s remaining`;
        }
        $('#overlayText').text(msg);
      });
      
      // Combine already loaded rows with newly fetched ones
      exportRows = [...state.rows, ...remainingRows];
      
      // Update state for future operations
      state.rows.push(...remainingRows);
      state.pageNumber = totalPages + 1;
    } else {
      // All data already loaded
      exportRows = state.rows;
    }
    
    $('#overlayText').text('Generating CSV file...');
    
    // Generate CSV
    const headers = ['Account ID','Account Name','Previous Balance','Debit Amount','Credit Amount','Final Balance','Transaction Id'];
    const lines = [headers.join(',')];
    exportRows.forEach(r => {
      const row = [
        (r.accountID ?? r.accountId ?? ''),
        '"' + String(r.accountName ?? '').replaceAll('"', '""') + '"',
        fmt(r.previousBalance).replaceAll(',', ''),
        fmt(r.debitAmount).replaceAll(',', ''),
        fmt(r.creditAmount).replaceAll(',', ''),
        fmt(r.finalBalance).replaceAll(',', ''),
        (r.balanceHisId ?? '')
      ];
      lines.push(row.join(','));
    });
    
    const csv = '\ufeff' + lines.join('\n'); // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const accText = $('#accountSelect').find(':selected').text() || 'account';
    a.download = `statement_${accText.replaceAll(' ', '_')}_${state.fromDate}_${state.toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('Export failed');
  } finally {
    hideOverlay();
    setBtnLoading($('#btnExport'), $('#exportSpinner'), false);
  }
}

async function printYTD() {
  setBtnLoading($('#btnYTD'), $('#ytdSpinner'), true);
  showOverlay('Preparing Year-to-Date...');
  try {
    const today = new Date();
    state.fromDate = `${today.getFullYear()}-01-01`;
    state.toDate = yyyymmdd(today);
    $('#fromDate').val(state.fromDate);
    $('#toDate').val(state.toDate);
    await runSearch();
    await loadAllRemaining('Loading all YTD pages for print...');
    window.print();
  } finally {
    hideOverlay();
    setBtnLoading($('#btnYTD'), $('#ytdSpinner'), false);
  }
}

// ====== Boot ======
$(async function () {
  try {
    initDatePickers();
    bindEvents();
    showOverlay('Loading accounts...');
    await loadAccounts();
  } catch (e) {
    console.error(e);
    alert('Failed to initialize application.');
  } finally {
    hideOverlay();
  }
});
