const ROOT_VERSION_FLAGS = new Set(['-v', '-V', '--version'])

export function isRootVersionRequest(args: readonly string[]): boolean {
  return args.length === 1 && ROOT_VERSION_FLAGS.has(args[0])
}
