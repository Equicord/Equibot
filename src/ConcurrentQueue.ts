export type Task = () => void | Promise<void>;

export class ConcurrentQueue {
    private runningCount = 0;
    private pending = [] as Task[];

    constructor(public readonly concurrentTasks = 10) { }

    push(task: Task) {
        this.pending.push(task);
        this.runQueue();
    }

    unshift(task: Task) {
        this.pending.unshift(task);
        this.runQueue();
    }

    private runQueue() {
        while (this.runningCount < this.concurrentTasks) {
            const nextTask = this.pending.shift();
            if (!nextTask) break;
            this.run(nextTask);
        }
    }

    private async run(task: Task) {
        this.runningCount++;
        try {
            await task();
        } finally {
            this.runningCount--;
            this.runQueue();
        }
    }
}
