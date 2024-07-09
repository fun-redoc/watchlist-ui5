import { TProvideNumericID } from "../services/DBManager"

export const DB_NAME_TRANSACTIONS = "transactionsIDXDB"
export const DB_STORE_TRANSACTIONS = "transactionsStore"
export const DB_VERSION_TRANSACTIONS = 3

interface TransactionEntry extends TProvideNumericID {
    symbol:string
    name:string
    bank:string
    currency:string
    transaction:"Buy"|"Sell"
    price:float
    fee:float
    amount:int
    date: Date // TODO: maybe UI5Date better?? try out in case of issues
    // TODO maybe taxes could be  entered as a separate entry or item
}
export default TransactionEntry