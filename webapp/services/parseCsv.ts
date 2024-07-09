//
// see: https://www.rfc-editor.org/rfc/rfc4180
//
import { Transistions, MealyAutomaton } from "./MealyAutomaton"

type Separator = ',' | ';'

/*
    - the parse function defines the state transitions, input (predicates) and output (action) functions
    - the States themselves are defined in the State type for type checking
    - based on the transitions the Mealy Automaton is created and run on the input string
    - you can chhose ',' xor ';' as separator
*/
export default function parseCsv(s:  string, sep:Separator = ',') : Record<number,number|string>[] {
    type State = "start"|"cr"|"lf"|"text"|"escaped"|"quote1"|"ignoreWhitespaceAfterClosingQuote"|"ready"
    let buf = ""
    let col = 0
    let quotes = 0
    let lines:ReturnType<typeof parseCsv> = [] 
    let cols:typeof lines[number] = {} 

    // predicates -  state inputs
    const isEOF = (c:string):boolean => c === '\0' 
    const isDQuote = (c:string):boolean => c ==='\"' 
    const isSep = (c:string):boolean => c ===sep
    const isChar = (check:string): (c:string)=>boolean => (c) =>  c === check
    const isWhitespace = (c:string) : boolean => c === '\t' || c === ' '
    if(sep === ',') {
        var isText = (c:string) : boolean => (c.match(/[\p{L}\p{N}\-()\.;]/gu) || "").length > 0
    } else {
        var isText = (c:string) : boolean => (c.match(/[\p{L}\p{N}\-()\.,]/gu) || "").length > 0
    }

    // actions - arrow outputs
    function actions(...as:((c?:string)=>void)[]) : (c?:string) => void {
        // execute multiple actions in a row
        return ((c?:string) => { as.forEach(a => a(c)) })
    }
    function bufferText(c?:string) {
        if(c) buf += c
    }
    function colReady() {
        cols[col] = buf
        col++
        buf = ""
    }
    function rowReady() {
       lines.push(cols) 
       cols = {}
       col = 0
    }
    function openQuote() {
        if(quotes !== 0 ) throw new Error(`mismatched open quote in row ${stateMachine.row} in position ${stateMachine.posInRow}.`)
        quotes += 1
    }
    function closeQuote() {
        if(quotes !== 1 ) throw new Error(`mismatched close quote in row ${stateMachine.row} in position ${stateMachine.posInRow}.`)
        quotes -= 1
    }

    // https://www.rfc-editor.org/rfc/rfc4180
    const transitions:Transistions<State> = {
        "start": [  { predicate: isWhitespace, nextState: "text", action:bufferText },
                    { predicate: isDQuote, nextState: "escaped", action:openQuote },
                    { predicate: isText, nextState: "text", action:bufferText },
                    { predicate: isSep, nextState: "start", action:colReady },
                    { predicate: isChar('\r'), nextState: "cr", action:actions(colReady,rowReady) },
                    { predicate: isChar('\n'), nextState: "lf", action:actions(colReady,rowReady) },
                    //{ predicate: isEOF, nextState: "ready", action:actions(colReady,rowReady) },
                    { predicate: isEOF, nextState: "ready", action:null },
                ],
        "escaped": [{ predicate: isWhitespace, nextState: "escaped", action:bufferText },
                    { predicate: isDQuote, nextState: "quote1", action:null },
                    { predicate: isText, nextState: "escaped", action:bufferText },
                    { predicate: isSep, nextState: "escaped", action:bufferText },
                    { predicate: isChar('\r'), nextState: "escaped", action:bufferText },
                    { predicate: isChar('\n'), nextState: "escaped", action:bufferText },
                ],
        "quote1":[  { predicate: isWhitespace, nextState: "ignoreWhitespaceAfterClosingQuote", action:actions(closeQuote,colReady) },
                    { predicate: isDQuote, nextState: "escaped", action:()=>bufferText('"') }, 
                    { predicate: isSep, nextState: "start", action:actions(closeQuote,colReady) },
                    { predicate: isChar('\r'), nextState: "lf", action:actions(closeQuote,colReady,rowReady) },
                    { predicate: isChar('\n'), nextState: "start", action:actions(closeQuote,colReady,rowReady) },
                    { predicate: isEOF, nextState: "ready", action:actions(closeQuote,colReady,rowReady) },
                ],
        "ignoreWhitespaceAfterClosingQuote": [
                    { predicate:isWhitespace, nextState:"ignoreWhitespaceAfterClosingQuote", action: null},
                    { predicate: isSep, nextState: "start", action:null },
                    { predicate: isChar('\r'), nextState: "lf", action:rowReady },
                    { predicate: isChar('\n'), nextState: "start", action:rowReady },
                    { predicate: isEOF, nextState: "ready", action:rowReady },
        ],
        "cr":[  { predicate: isWhitespace, nextState: "text", action:bufferText },
                { predicate: isDQuote, nextState: "escaped", action:null },
                { predicate: isText, nextState: "text", action:bufferText },
                { predicate: isChar('\r'), nextState: "cr", action:actions(colReady,rowReady) },
                { predicate: isChar('\n'), nextState: "lf", action:null },
                { predicate: isEOF, nextState: "ready", action:actions(colReady,rowReady) },
                ],
        "lf":[      { predicate: isWhitespace, nextState: "text", action:bufferText },
                    { predicate: isDQuote, nextState: "escaped", action:null },
                    { predicate: isText, nextState: "text", action:bufferText },
                    { predicate: isChar('\r'), nextState: "cr", action:actions(colReady,rowReady) },
                    { predicate: isChar('\n'), nextState: "lf", action:actions(colReady,rowReady) },
                    { predicate: isEOF, nextState: "ready", action:actions(colReady,rowReady) },
                ],
        "text":[    { predicate: isWhitespace, nextState: "text", action:bufferText },
                    { predicate: isText, nextState: "text", action:bufferText },
                    { predicate: isSep, nextState: "start", action:colReady },
                    { predicate: isChar('\r'), nextState: "lf", action:actions(colReady,rowReady) },
                    { predicate: isChar('\n'), nextState: "start", action:actions(colReady,rowReady) },
                    { predicate: isEOF, nextState: "ready", action:actions(colReady,rowReady) },
                ],
        "ready":[{predicate:(_)=>true, nextState:"ready", action:null}]
    }


    const stateMachine = new MealyAutomaton(transitions,"start")
    stateMachine.runOn(s)
    return lines
}