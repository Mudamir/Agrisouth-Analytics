import React, { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import InvoicePDF from './InvoicePDF';
import { useInvoiceData, useInvoiceNumbers } from '@/hooks/useInvoiceData';

const InvoiceGenerator: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const { data: invoiceNumbers, isLoading: loadingInvoices } = useInvoiceNumbers();
  const { data: invoiceData, isLoading: loadingData, error } = useInvoiceData(selectedInvoice);

  const handleInvoiceSelect = (invoiceNo: string) => {
    setSelectedInvoice(invoiceNo);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 border-0"
        >
          <FileText className="mr-2 h-4 w-4" />
          Generate Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice PDF
          </DialogTitle>
          <DialogDescription>
            Select an invoice number to generate a PDF document with all related shipping records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Number Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Number</label>
            <Select
              value={selectedInvoice || ''}
              onValueChange={handleInvoiceSelect}
              disabled={loadingInvoices}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select invoice number..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {loadingInvoices ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    Loading invoice numbers...
                  </div>
                ) : invoiceNumbers && invoiceNumbers.length > 0 ? (
                  invoiceNumbers.map((invoiceNo) => (
                    <SelectItem key={invoiceNo} value={invoiceNo}>
                      {invoiceNo}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No invoice numbers found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {loadingData && selectedInvoice && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Loading invoice data...</AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load invoice data'}
              </AlertDescription>
            </Alert>
          )}

          {/* Invoice Preview Summary */}
          {invoiceData && !loadingData && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Invoice Number:</span>
                <span className="text-sm">{invoiceData.invoiceNo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Invoice Date:</span>
                <span className="text-sm">
                  {invoiceData.invoiceDate
                    ? new Date(invoiceData.invoiceDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Records:</span>
                <span className="text-sm">{invoiceData.records.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Containers:</span>
                <span className="text-sm">
                  {[...new Set(invoiceData.records.map((r) => r.container))].length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Cartons:</span>
                <span className="text-sm">
                  {invoiceData.records.reduce((sum, r) => sum + r.cartons, 0).toLocaleString()}
                </span>
              </div>
              {invoiceData.records[0] && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">{invoiceData.records[0].customerName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">BL No.:</span>
                    <span className="text-sm">{invoiceData.records[0].billingNo || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Download Button */}
          {invoiceData && !loadingData && (
            <PDFDownloadLink
              document={
                <InvoicePDF
                  records={invoiceData.records}
                  invoiceNo={invoiceData.invoiceNo}
                  invoiceDate={invoiceData.invoiceDate}
                />
              }
              fileName={`Invoice_${invoiceData.invoiceNo}_${new Date().toISOString().split('T')[0]}.pdf`}
            >
              {({ blob, url, loading, error }) => (
                <Button
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Invoice PDF
                    </>
                  )}
                </Button>
              )}
            </PDFDownloadLink>
          )}

          {/* Instructions */}
          {!selectedInvoice && (
            <div className="text-center text-sm text-muted-foreground pt-4">
              Select an invoice number above to preview and download the PDF
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGenerator;

