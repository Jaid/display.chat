import type {worker} from 'monaco-editor'

// Monaco exposes this worker entry at runtime but does not ship a declaration for it.
// @ts-expect-error missing Monaco worker-entry declaration
import {initialize as initializeWorker} from 'monaco-editor/editor/editor.worker.js'

type WorkerImplementation<T> = {
  [Key in keyof T]: T[Key] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Awaited<Result> | PromiseLike<Awaited<Result>>
    : never
}

type WebWorkerInitializeFunction<T, CreateData = unknown> = (
  context: worker.IWorkerContext,
  createData: CreateData,
) => WorkerImplementation<T>

/** Monaco 0.56-compatible replacement for monaco-worker-manager/worker. */
export const initialize = <T, CreateData = unknown>(
  create: WebWorkerInitializeFunction<T, CreateData>,
) => {
  initializeWorker((context: worker.IWorkerContext, createData: unknown) => Object.create(create(context, createData as CreateData)))
}
