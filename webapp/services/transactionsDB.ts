import TransactionEntry, { DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS } from "../types/TransactionEntry"
import { mkDBManager } from "./DBManager"

export default function accessTransactionsDB() {
    const dbm = mkDBManager<TransactionEntry>(DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS, [{indexName:"symbol",isUnique:false},{indexName:"buyOrSell", isUnique:false}])
    return dbm
}