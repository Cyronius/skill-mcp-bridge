/**
 * Substitute environment variables in a string.
 * Supports ${VAR} syntax.
 */
export function substituteEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      throw new Error(`Environment variable '${varName}' is not set`);
    }
    return envValue;
  });
}

/**
 * Substitute environment variables in all string values of an object.
 */
export function substituteEnvVarsInObject(
  obj: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = substituteEnvVars(value);
  }
  return result;
}
