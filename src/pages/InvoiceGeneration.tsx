import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, FileText, Download, Loader2, Eye, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoice/InvoicePDF';
import { useInvoiceData, useInvoiceNumbers, useSalesPrices } from '@/hooks/useInvoiceData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { format, parse } from 'date-fns';

interface InvoiceGenerationProps {
  onNavigate?: (page: string) => void;
}

const InvoiceGeneration: React.FC<InvoiceGenerationProps> = ({ onNavigate }) => {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get available years and weeks
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  React.useEffect(() => {
    const fetchYears = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('shipping_records')
        .select('year')
        .not('invoice_no', 'is', null);
      if (data) {
        const years = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
        setAvailableYears(years);
      }
    };
    fetchYears();
  }, []);

  React.useEffect(() => {
    const fetchWeeks = async () => {
      if (!supabase || !selectedYear) {
        setAvailableWeeks([]);
        return;
      }
      const { data } = await supabase
        .from('shipping_records')
        .select('week')
        .eq('year', selectedYear)
        .not('invoice_no', 'is', null);
      if (data) {
        const weeks = [...new Set(data.map(r => r.week))].sort((a, b) => a - b);
        setAvailableWeeks(weeks);
      }
    };
    fetchWeeks();
  }, [selectedYear]);

  const { data: invoiceNumbers, isLoading: loadingInvoices } = useInvoiceNumbers(
    selectedYear,
    selectedWeek,
    searchTerm
  );
  const { data: invoiceData, isLoading: loadingData, error } = useInvoiceData(selectedInvoice);
  const { data: salesPrices = new Map() } = useSalesPrices(invoiceData?.records || []);

  const handleClearFilters = () => {
    setSelectedYear(null);
    setSelectedWeek(null);
    setSearchTerm('');
    setSelectedInvoice(null);
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('generate');
    }
  };

  const handleInvoiceSelect = (invoiceNo: string) => {
    setSelectedInvoice(invoiceNo);
    setShowPreview(false);
  };

  // Generate professional filename
  const getInvoiceFileName = (invoiceNo: string, invoiceDate: string | null): string => {
    let dateStr = '';
    if (invoiceDate) {
      try {
        const date = parse(invoiceDate, 'yyyy-MM-dd', new Date());
        if (!isNaN(date.getTime())) {
          dateStr = format(date, 'yyyyMMdd');
        } else {
          dateStr = format(new Date(), 'yyyyMMdd');
        }
      } catch {
        dateStr = format(new Date(), 'yyyyMMdd');
      }
    } else {
      dateStr = format(new Date(), 'yyyyMMdd');
    }
    return `INVOICE_${invoiceNo}_${dateStr}.pdf`;
  };

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight mb-2">Invoice Generator</h1>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground">
              Search for an invoice number and preview the PDF before downloading
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
          {/* Left Column - Search and Details */}
          <div className="space-y-6">
            {/* Search Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Invoice
                </CardTitle>
                <CardDescription>
                  Select an invoice number to generate a PDF document
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Select
                      value={selectedYear?.toString() || 'all'}
                      onValueChange={(value) => {
                        if (value === 'all') {
                          setSelectedYear(null);
                          setSelectedWeek(null);
                        } else {
                          setSelectedYear(parseInt(value, 10));
                          setSelectedWeek(null); // Reset week when year changes
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Week</label>
                    <Select
                      value={selectedWeek?.toString() || 'all'}
                      onValueChange={(value) => {
                        if (value === 'all') {
                          setSelectedWeek(null);
                        } else {
                          setSelectedWeek(parseInt(value, 10));
                        }
                      }}
                      disabled={!selectedYear}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Weeks" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Weeks</SelectItem>
                        {availableWeeks.map((week) => (
                          <SelectItem key={week} value={week.toString()}>
                            Week {week}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Invoice Number</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Type invoice number to search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedYear || selectedWeek || searchTerm) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}

                {/* Invoice Number Dropdown */}
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
                          <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
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
                          {(selectedYear || selectedWeek || searchTerm) && (
                            <div className="mt-1 text-xs">Try adjusting your filters</div>
                          )}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {invoiceNumbers && invoiceNumbers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Found {invoiceNumbers.length} invoice{invoiceNumbers.length !== 1 ? 's' : ''}
                    </p>
                  )}
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
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error instanceof Error ? error.message : 'Failed to load invoice data'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Invoice Summary */}
                {invoiceData && !loadingData && (
                  <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Invoice Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Invoice No.:</span>
                          <p className="font-semibold">{invoiceData.invoiceNo}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Invoice Date:</span>
                          <p className="font-semibold">
                            {invoiceData.invoiceDate
                              ? new Date(invoiceData.invoiceDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Records:</span>
                          <p className="font-semibold">{invoiceData.records.length}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Containers:</span>
                          <p className="font-semibold">
                            {[...new Set(invoiceData.records.map((r) => r.container))].length}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Cartons:</span>
                          <p className="font-semibold">
                            {invoiceData.records.reduce((sum, r) => sum + r.cartons, 0).toLocaleString()}
                          </p>
                        </div>
                        {invoiceData.records[0] && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Customer:</span>
                              <p className="font-semibold">{invoiceData.records[0].customerName || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">BL No.:</span>
                              <p className="font-semibold">{invoiceData.records[0].billingNo || 'N/A'}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowPreview(!showPreview)}
                          className="flex-1 gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {showPreview ? 'Hide Preview' : 'Preview PDF'}
                        </Button>
                        <PDFDownloadLink
                          document={
                            <InvoicePDF
                              records={invoiceData.records}
                              invoiceNo={invoiceData.invoiceNo}
                              invoiceDate={invoiceData.invoiceDate}
                              salesPrices={salesPrices}
                            />
                          }
                          fileName={getInvoiceFileName(invoiceData.invoiceNo, invoiceData.invoiceDate)}
                          className="flex-1"
                        >
                          {({ blob, url, loading, error }) => (
                            <Button
                              className="flex-1 gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Download PDF
                                </>
                              )}
                            </Button>
                          )}
                        </PDFDownloadLink>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - PDF Preview */}
          <div className="space-y-6">
            {showPreview && invoiceData && !loadingData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    PDF Preview
                  </CardTitle>
                  <CardDescription>
                    Preview of the invoice that will be generated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    <PDFViewer width="100%" height="100%">
                      <InvoicePDF
                        records={invoiceData.records}
                        invoiceNo={invoiceData.invoiceNo}
                        invoiceDate={invoiceData.invoiceDate}
                        salesPrices={salesPrices}
                      />
                    </PDFViewer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {selectedInvoice
                      ? 'Click "Preview PDF" to see the invoice preview'
                      : 'Select an invoice number to preview and download'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGeneration;

