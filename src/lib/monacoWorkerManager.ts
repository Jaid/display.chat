import type {Uri, editor} from 'monaco-editor'

type PromisifiedWorker<T> = {
  [Key in keyof T]: T[Key] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Promise<Awaited<Result>>
    : never
}

type WorkerManagerOptions<CreateData> = {
  createData?: CreateData
  interval?: number
  label: string
  moduleId: string
  stopWhenIdleFor?: number
}

type MonacoSubset = Pick<typeof import('monaco-editor'), 'editor'>

type MonacoEnvironmentWithWorker = {
  getWorker?: (moduleId: string, label: string) => Promise<Worker> | Worker
}

const prepareWorker = async <CreateData>(
  worker: Promise<Worker> | Worker,
  createData: CreateData,
) => {
  const resolved = await worker
  const postMessage = resolved.postMessage.bind(resolved)
  let initialized = false
  resolved.postMessage = ((message: unknown, transferOrOptions?: StructuredSerializeOptions | Transferable[]) => {
    if (!initialized && message === '-please-ignore-') {
      initialized = true
      postMessage(createData)
      return
    }
    if (Array.isArray(transferOrOptions)) {
      postMessage(message, transferOrOptions)
      return
    }
    postMessage(message, transferOrOptions)
  }) as Worker['postMessage']
  return resolved
}

/** Monaco 0.56-compatible replacement for monaco-worker-manager. */
export const createWorkerManager = <WorkerApi extends object, CreateData = unknown>(
  monaco: MonacoSubset,
  options: WorkerManagerOptions<CreateData>,
) => {
  let createData = options.createData as CreateData
  let worker: editor.MonacoWebWorker<WorkerApi> | undefined
  let lastUsed = 0
  let disposed = false
  const interval = options.interval ?? 30_000
  const stopWhenIdleFor = options.stopWhenIdleFor ?? 120_000

  const stopWorker = () => {
    worker?.dispose()
    worker = undefined
  }
  const intervalId = setInterval(() => {
    if (worker && Date.now() - lastUsed > stopWhenIdleFor) {
      stopWorker()
    }
  }, interval)

  return {
    dispose() {
      disposed = true
      clearInterval(intervalId)
      stopWorker()
    },
    async getWorker(...resources: Uri[]): Promise<PromisifiedWorker<WorkerApi>> {
      if (disposed) {
        throw new Error('Worker manager has been disposed.')
      }
      lastUsed = Date.now()
      if (!worker) {
        const environment = globalThis.MonacoEnvironment as MonacoEnvironmentWithWorker | undefined
        if (!environment?.getWorker) {
          throw new Error(`MonacoEnvironment.getWorker is required for the \"${options.label}\" worker.`)
        }
        const configuredWorker = environment.getWorker(options.moduleId, options.label)
        worker = monaco.editor.createWebWorker<WorkerApi>({
          worker: prepareWorker(configuredWorker, createData),
        })
      }
      return worker.withSyncedResources(resources) as Promise<PromisifiedWorker<WorkerApi>>
    },
    updateCreateData(nextCreateData: CreateData) {
      createData = nextCreateData
      stopWorker()
    },
  }
}
