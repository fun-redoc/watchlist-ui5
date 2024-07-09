export type Transition<TState extends string | number | symbol> = {
        predicate:(c:string)=>boolean,
        nextState:TState
        action:((c?:string)=>void) | null
}
export type Transistions<TState extends string | number | symbol> = Record<TState, Transition<TState>[]>

export class MealyAutomaton<TState extends string | number | symbol> {
    private transitions:Transistions<TState>
    private state:TState
    //private buf:string = ""
    private _posInRow:number = 0
    private _pos:number = 0
    //private col:number = 0
    private _row:number = 0
    //private quotes:number = 0
    constructor(transitions:Transistions<TState>, start:TState) {
        this.transitions = transitions
        this.state = start
    }

    public get pos() {
        return this._pos
    }
    private set pos(v:number) {
        this._pos = v
    }
    public get row() {
        return this._row
    }
    private set row(v:number) {
        this._row = v
    }
    public get posInRow() {
        return this._posInRow
    }
    private set posInRow(v:number) {
        this._posInRow = v
    }

    private getTransition(c:string) : Transition<TState> {
        const transitions = this.transitions[this.state]
        const state = this.state
        if(!transitions) {
            throw new Error(`Unknown state '${String(state)}'.`)
        }
        for (let index = 0; index < transitions.length; index++) {
            const transition = transitions[index];
            if(transition.predicate(c)) {
                return transition
            }
        }
        throw new Error(`No transition in state '${String(state)}' for input '${c}' (${c.charCodeAt(0)}) at position ${this.pos} row ${this.row} position in row ${this.posInRow} available.`)
    }


    public runOn(s:string) {
        while(this.state !== "ready") {
            let c = s.charAt(this.pos) || '\0'
            let transition = this.getTransition( c) 
            if(transition.action !== null) transition.action(c)
            this.state = transition.nextState
            this.pos += 1
            if(c === '\n') {
                this.row++
                this.posInRow = 0
            } else {
                if(c === '\r') {
                    this.posInRow = 0
                } else {
                    this.posInRow += 1
                }
            }
        }
    }
}