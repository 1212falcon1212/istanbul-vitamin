package services

import "testing"

func TestBankTransferReady(t *testing.T) {
 s := map[string]string{"bank_transfer_bank":"Test", "bank_transfer_holder":"Test", "bank_transfer_iban":"TR33 0006 1005 1978 6457 8413 26"}
 if !BankTransferReady(s) { t.Fatal("valid IBAN rejected") }
 s["bank_transfer_iban"] = "TR330006100519786457841327"
 if BankTransferReady(s) { t.Fatal("invalid checksum accepted") }
 s["bank_transfer_iban"] = "TR330006100519786457841326"
 s["bank_transfer_holder"] = ""
 if BankTransferReady(s) { t.Fatal("missing holder accepted") }
}
