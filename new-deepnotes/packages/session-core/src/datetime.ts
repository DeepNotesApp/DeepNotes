function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function addHours(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setHours(x.getHours() + n);
  return x;
}

export { addDays, addHours };
