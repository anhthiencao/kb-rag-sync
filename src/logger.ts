/** JSON-line logging so the DigitalOcean job logs are greppable and structured. */
type Fields = Record<string, unknown>;

function emit(level: string, message: string, fields?: Fields): void {
  const payload: Fields = { level, logger: 'optibot', message, ...(fields ?? {}) };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

export const logger = {
  info: (message: string, fields?: Fields) => emit('INFO', message, fields),
  warn: (message: string, fields?: Fields) => emit('WARN', message, fields),
  error: (message: string, fields?: Fields) => emit('ERROR', message, fields),
};
