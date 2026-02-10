import React from 'react';
import { FileText, FileSpreadsheet, FileBarChart, FileDown, ArrowRight } from 'lucide-react';

interface GenerateProps {
  onNavigate?: (page: string) => void;
}

const Generate: React.FC<GenerateProps> = ({ onNavigate }) => {
  const handleInvoiceGeneratorClick = () => {
    if (onNavigate) {
      onNavigate('invoice-generation');
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-hidden flex flex-col">
      {/* Header Section */}
      <div className="mb-8 space-y-3">
        <div>
          <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight mb-2">
            Generate Documents
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Create professional documents and reports from your shipping data with advanced filtering and customization options.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
          {/* Card 1: Invoice Generator - Premium Design */}
          <button
            onClick={handleInvoiceGeneratorClick}
            className="group relative bg-gradient-to-br from-primary via-primary/95 to-secondary text-primary-foreground rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-primary/30 text-left cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/30 focus:ring-offset-2 overflow-hidden"
          >
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-5">
              {/* Icon Section */}
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border border-white/25">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold font-heading tracking-tight">Invoice Generator</h3>
                <p className="text-sm text-primary-foreground/90 leading-relaxed">
                  Generate professional PDF invoices based on invoice numbers. Includes all shipping details, container information, and customer data.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <span className="text-sm text-primary-foreground/90">Groups all records by invoice number</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <span className="text-sm text-primary-foreground/90">Includes BL, containers, and vessel details</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <span className="text-sm text-primary-foreground/90">Professional company-branded format</span>
                </div>
              </div>
            </div>
          </button>

          {/* Card 2: Custom Reports - Elegant Coming Soon */}
          <div className="group relative bg-gradient-to-br from-card to-card/50 text-foreground rounded-2xl p-8 shadow-lg border border-border/60 overflow-hidden">
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-muted/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-5">
              {/* Icon Section */}
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center border border-border/50">
                  <FileSpreadsheet className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Soon</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold font-heading tracking-tight text-foreground/80">Custom Reports</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate custom Excel reports with advanced filtering and grouping options. Perfect for detailed data analysis and custom business needs.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Advanced filtering and sorting</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Custom column selection</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Multiple export formats</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Analytics Reports - Elegant Coming Soon */}
          <div className="group relative bg-gradient-to-br from-card to-card/50 text-foreground rounded-2xl p-8 shadow-lg border border-border/60 overflow-hidden">
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-muted/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-5">
              {/* Icon Section */}
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center border border-border/50">
                  <FileBarChart className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Soon</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold font-heading tracking-tight text-foreground/80">Analytics Reports</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Export detailed analytics and performance reports in PDF format. Visual charts and comprehensive data insights.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Performance metrics and KPIs</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Visual charts and graphs</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Trend analysis and forecasting</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Data Export - Elegant Coming Soon */}
          <div className="group relative bg-gradient-to-br from-card to-card/50 text-foreground rounded-2xl p-8 shadow-lg border border-border/60 overflow-hidden">
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-transparent" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-muted/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-5">
              {/* Icon Section */}
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-xl bg-muted/40 flex items-center justify-center border border-border/50">
                  <FileDown className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <div className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Data Page</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold font-heading tracking-tight text-foreground/80">Data Export</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Export complete shipping data to Excel format. Full dataset with all columns and records for external analysis.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Complete dataset export</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Excel format with formatting</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0 mt-0.5 border border-border/50">
                    <span className="text-muted-foreground/50 text-xs">→</span>
                  </div>
                  <span className="text-sm text-muted-foreground">All columns and filters applied</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Generate;

