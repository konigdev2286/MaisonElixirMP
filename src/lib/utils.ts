// Utilitaires de formatage et classes

export function cn(...inputs: (string | boolean | undefined | null)[]): string {
  return inputs.filter(Boolean).join(' ');
}

// Formatage FCFA sans décimales, avec séparateur d'espace standard
export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 FCFA';
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

// Formatage de date lisible pour le commerçant (ex: 27 oct. 2026)
export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Formatage heure (ex: 14:35)
export function formatTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Format date pour input HTML date (YYYY-MM-DD)
export function toInputDateFormat(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
