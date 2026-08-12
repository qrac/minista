export interface ModuleEvaluator {
  importModule<Exports = Record<string, unknown>>(
    moduleId: string,
  ): Promise<Exports>
}
