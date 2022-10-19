//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Function that allows you observe progess of test.
 */
export type TestProgressObserver = (progress: TestProgress) => void

/**
 * Information about test progress.
 */
export interface TestProgress {
     readonly total: number
     readonly progress: number   // succeeded + failed + skipped
     readonly succeeded: number
     readonly failed: number
     readonly skipped: number

     readonly elapsedTime: number
 }
 
 /**
  * Class providing TestProgress
  */
export class TestCounter implements TestProgress {
    readonly counterName: string
    private _total: number
    private _succeeded: number
    private _failed: number
    private _skipped: number
    private _timestamp: number
    private observers: TestProgressObserver[]
 
    get total(): number { return this._total }
    get succeeded(): number { return this._succeeded }
    get failed(): number { return this._failed }
    get skipped(): number { return this._skipped }

    get progress(): number {
        return this._succeeded + this._failed + this._skipped
    }

    get elapsedTime(): number {
       return (Date.now() - this._timestamp) * 0.001
    }
 
    constructor(counterName: string, total: number = 0) {
        this.counterName = counterName
        this._total = total
        this._succeeded = 0
        this._failed = 0
        this._skipped = 0
        this._timestamp = 0
        this.observers = []
    }
 
    restart(total: number) {
        this._total = total
        this._succeeded = 0
        this._failed = 0
        this._skipped = 0
        this._timestamp = Date.now()
        this.notify('restart')
    }
 
    resetObservers() {
        this.observers = []
    }
 
    addFailed(amount: number = 1) {
        this._failed += amount
        this.notify('addFailed')
    }

    addSucceeded(amount: number = 1) {
        this._succeeded += amount
        this.notify('addSucceeded')
    }
 
    addSkipped(amount: number = 1) {
        this._skipped += amount
        this.notify('addSkipped')
    }

    addObserver(observer: TestProgressObserver) {
        this.observers.push(observer)
    }

    private notify(op: string) {
        if (this.succeeded + this.skipped + this.failed > this.total) {
            throw new Error(`Internal error. Counter '${this.counterName}' exceeded its maximum value ${this.total} after ${op}`)
        }
        if (this._timestamp == 0) {
           throw new Error(`Internal error. Counter '${this.counterName}' is not restarted before ${op}.`)
        }
        const progress = {
            total: this.total,
            progress: this.progress,
            succeeded: this.succeeded,
            failed: this.failed,
            skipped: this.skipped,
            elapsedTime: this.elapsedTime
        }
        this.observers.forEach((observer) => observer(progress))
    }
}
 