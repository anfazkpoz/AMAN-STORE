export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) { 
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

export const getTodayFormatted = (): string => {
  return formatDate(new Date().toISOString().split('T')[0]);
};
