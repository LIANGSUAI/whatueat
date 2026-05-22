function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function parseDate(dateStr) {
  const parts = String(dateStr || '').split('-').map(function(item) {
    return Number(item);
  });

  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return new Date();
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addDays(dateStr, count) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + count);
  return formatDate(d);
}

function formatCnDate(dateStr) {
  const today = formatDate(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const d = parseDate(dateStr);
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  const label = pad(d.getMonth() + 1) + '月' + pad(d.getDate()) + '日 ' + weekday;

  if (dateStr === today) return '今天 ' + label;
  if (dateStr === yesterday) return '昨天 ' + label;
  if (dateStr === tomorrow) return '明天 ' + label;
  return label;
}

function recordDate(record) {
  if (!record) return '';

  if (record.timestamp) {
    const timestamp = String(record.timestamp);
    if (timestamp.indexOf('T') !== -1) {
      return timestamp.split('T')[0];
    }

    if (timestamp.length >= 10) {
      return timestamp.slice(0, 10);
    }
  }

  return record.date || '';
}

function nowTimeText() {
  const d = new Date();
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function timestampForDate(dateStr) {
  const now = new Date();
  return dateStr + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

function lastDays(count) {
  const days = [];
  const today = new Date();

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(formatDate(d));
  }

  return days;
}

module.exports = {
  formatDate: formatDate,
  parseDate: parseDate,
  addDays: addDays,
  formatCnDate: formatCnDate,
  recordDate: recordDate,
  nowTimeText: nowTimeText,
  timestampForDate: timestampForDate,
  lastDays: lastDays
};
