import React, { useMemo } from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { ShippingRecord } from '@/types/shipping';
import logoImage from '@/Images/AGSouth-Icon.png';

// Register fonts for better appearance
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
  ],
});

// Professional Corporate Styles - Optimized for single page with Dark Green
const styles = StyleSheet.create({
  page: {
    padding: 35,
    paddingBottom: 80, // Extra padding at bottom for footer
    fontFamily: 'Roboto',
    fontSize: 8,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  // Top Header with Logo and Invoice Info
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: '2.5pt solid #19432a',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  logo: {
    width: 65,
    height: 65,
    marginRight: 6,
    marginTop: 0,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#19432a',
    marginBottom: 4,
    marginTop: 3,
    letterSpacing: 0.5,
    lineHeight: 1.2,
  },
  companyAddress: {
    fontSize: 8,
    marginBottom: 2,
    marginTop: 2,
    color: '#333333',
    lineHeight: 1.3,
  },
  invoiceInfoTop: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#19432a',
    marginBottom: 8,
    marginTop: 0,
    textAlign: 'right',
    letterSpacing: 1,
  },
  invoiceDetailsBox: {
    border: '1.5pt solid #19432a',
    padding: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    minWidth: 115,
    alignItems: 'flex-start',
    boxShadow: '0 1pt 2pt rgba(0,0,0,0.1)',
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    width: '100%',
  },
  invoiceDetailRowLast: {
    marginBottom: 0,
  },
  invoiceDetail: {
    fontSize: 8,
    color: '#333333',
    fontWeight: 'bold',
  },
  invoiceDetailNumber: {
    fontSize: 10,
    color: '#19432a',
    fontWeight: 'bold',
  },
  invoiceLabel: {
    fontSize: 7,
    color: '#666666',
    marginRight: 1,
    minWidth: 45,
    fontWeight: 'bold',
  },
  // Bill To Section
  billToSection: {
    marginBottom: 5,
    backgroundColor: '#F8F9FA',
    border: '1pt solid #E0E0E0',
    borderRadius: 4,
    padding: 5,
  },
  billToHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#19432a',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billToCustomerName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333333',
    lineHeight: 1.3,
  },
  billToText: {
    fontSize: 7,
    marginBottom: 1,
    color: '#333333',
    lineHeight: 1.2,
  },
  // Items Table
  table: {
    marginTop: 5,
    marginBottom: 5,
    border: '1pt solid #E0E0E0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#19432a',
    color: '#FFFFFF',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #E0E0E0',
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#F8F9FA',
  },
  tableColItem: {
    width: '45%',
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 8,
    borderRight: '1pt solid #E0E0E0',
  },
  tableColQty: {
    width: '15%',
    textAlign: 'right',
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 8,
    borderRight: '1pt solid #E0E0E0',
  },
  tableColPrice: {
    width: '20%',
    textAlign: 'right',
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 8,
    borderRight: '1pt solid #E0E0E0',
  },
  tableColAmount: {
    width: '20%',
    textAlign: 'right',
    paddingRight: 5,
    paddingLeft: 5,
    fontSize: 8,
  },
  // Totals Section
  totalsSection: {
    marginTop: 4,
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#19432a',
    color: '#FFFFFF',
    padding: 6,
    width: '40%',
    justifyContent: 'space-between',
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Shipping Details - Single Column Clean Layout (Minimized)
  detailsSection: {
    marginTop: 4,
    border: '1pt solid #E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailsHeader: {
    backgroundColor: '#19432a',
    color: '#FFFFFF',
    padding: 2,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsContent: {
    padding: 3,
    backgroundColor: '#FFFFFF',
  },
  detailRow: {
    flexDirection: 'row',
    padding: 1.5,
    marginBottom: 0.5,
    width: '100%',
    borderBottom: '1pt solid #F0F0F0',
    alignItems: 'center',
  },
  detailRowLast: {
    borderBottom: 'none',
    marginBottom: 0,
  },
  detailRowFull: {
    flexDirection: 'row',
    padding: 2,
    marginTop: 0,
    width: '100%',
    borderTop: 'none',
    paddingTop: 2,
    alignItems: 'flex-start',
  },
  detailLabel: {
    width: '30%',
    fontWeight: 'bold',
    fontSize: 8,
    color: '#333333',
    marginRight: 8,
  },
  detailValue: {
    width: '70%',
    fontSize: 8,
    color: '#333333',
    fontWeight: 'normal',
  },
  containerList: {
    marginTop: 1,
  },
  containerItem: {
    fontSize: 7,
    color: '#333333',
    marginBottom: 0.5,
    paddingLeft: 0,
    lineHeight: 1.2,
  },
  // Beneficiary Section
  beneficiarySection: {
    marginTop: 4,
    border: '1pt solid #E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  beneficiaryHeader: {
    backgroundColor: '#19432a',
    color: '#FFFFFF',
    padding: 3,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  beneficiaryContent: {
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  beneficiaryRow: {
    flexDirection: 'row',
    padding: 2,
    marginBottom: 0.5,
    width: '100%',
    borderBottom: '1pt solid #F0F0F0',
    alignItems: 'flex-start',
  },
  beneficiaryRowLast: {
    borderBottom: 'none',
    marginBottom: 0,
  },
  beneficiaryLabel: {
    width: '35%',
    fontWeight: 'bold',
    fontSize: 7,
    color: '#333333',
    marginRight: 6,
  },
  beneficiaryValue: {
    width: '65%',
    fontSize: 7,
    color: '#333333',
    lineHeight: 1.2,
  },
  beneficiaryDivider: {
    marginTop: 3,
    marginBottom: 3,
    borderTop: '1pt solid #E0E0E0',
    paddingTop: 3,
  },
  // Footer - Fixed at bottom of page
  footer: {
    position: 'absolute',
    bottom: 35,
    left: 35,
    right: 35,
    fontSize: 7,
    color: '#666666',
  },
  footerDivider: {
    borderTop: '1pt solid #E0E0E0',
    marginBottom: 6,
  },
  footerAddress: {
    fontSize: 7,
    color: '#666666',
    marginBottom: 6,
    lineHeight: 1.3,
    textAlign: 'center',
  },
  contactInfo: {
    fontSize: 7,
    color: '#666666',
    marginBottom: 6,
    textAlign: 'center',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 2,
    gap: 80,
  },
  signatureBox: {
    alignItems: 'flex-start',
  },
  preparedBy: {
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 8,
  },
  preparedByName: {
    marginBottom: 0,
    marginTop: 0,
    color: '#333333',
    fontSize: 8,
  },
  checkedBy: {
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 8,
  },
  checkedByName: {
    marginBottom: 0,
    marginTop: 0,
    color: '#333333',
    fontSize: 8,
  },
});

interface InvoicePDFProps {
  records: ShippingRecord[];
  invoiceNo: string;
  invoiceDate: string;
  salesPrices?: Map<string, number>; // Map of "item|pack|supplier|year" -> price
  purchasePrices?: Map<string, number>; // Map of "item|pack|supplier|year" -> price
  pageOnly?: boolean; // If true, returns only Page content without Document wrapper
}

interface GroupedItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ records, invoiceNo, invoiceDate, salesPrices = new Map(), purchasePrices = new Map(), pageOnly = false }) => {
  if (!records || records.length === 0) {
    return null;
  }

  // Get common details from first record
  const firstRecord = records[0];
  const {
    week,
    sLine,
    billingNo,
    vessel,
    pol,
    etd,
    destination,
    eta,
    customerName,
    item,
    year,
    supplier,
  } = firstRecord;

  // Group items by pack type and calculate totals with sales prices
  const groupedItems = useMemo(() => {
    const items: { [key: string]: GroupedItem } = {};
    
    records.forEach((record) => {
      // Format description based on item type
      const itemUpper = (record.item || '').toUpperCase();
      let description = '';
      
      if (itemUpper === 'BANANAS') {
        // Format: "Philippine Bananas {weight} kg Grade {grade} {specs}"
        // Example: "Philippine Bananas 13.5 kg Grade A (4/5/6)"
        const pack = record.pack || '';
        const packUpper = pack.toUpperCase();
        
        // Extract weight (e.g., "13.5", "7.2", "6", "3")
        // Note: 7kg should be displayed as 7.2 kg
        let weight = '';
        const weightMatch = pack.match(/(\d+\.?\d*)\s*KG/i);
        if (weightMatch) {
          weight = weightMatch[1];
          // Convert 7kg to 7.2 kg
          if (weight === '7' && !pack.includes('7.2')) {
            weight = '7.2';
          }
        } else {
          // Fallback: try to extract any number at the start
          const numMatch = pack.match(/^(\d+\.?\d*)/);
          weight = numMatch ? numMatch[1] : pack;
          // Convert 7kg to 7.2 kg
          if (weight === '7' && !pack.includes('7.2')) {
            weight = '7.2';
          }
        }
        
        // Extract grade (A, B, SH, etc.)
        // Note: SH packs should display as "Grade A" in the invoice
        // Look for patterns like "KG A", "KG B", "KG SH", or standalone " A ", " B ", " SH "
        let isSH = false; // Track if it's an SH pack
        let grade = 'A'; // Default
        const gradePatterns = [
          { pattern: /KG\s+(SH|S\/H)/i, value: 'SH', isSH: true },
          { pattern: /KG\s+B/i, value: 'B', isSH: false },
          { pattern: /KG\s+A/i, value: 'A', isSH: false },
          { pattern: /\s(SH|S\/H)\s/i, value: 'SH', isSH: true },
          { pattern: /\sB\s/i, value: 'B', isSH: false },
          { pattern: /\sA\s/i, value: 'A', isSH: false },
          { pattern: /KG(SH|S\/H)/i, value: 'SH', isSH: true },
          { pattern: /KGB/i, value: 'B', isSH: false },
          { pattern: /KGA/i, value: 'A', isSH: false },
        ];
        
        for (const { pattern, value, isSH: patternIsSH } of gradePatterns) {
          if (pattern.test(packUpper)) {
            grade = value;
            isSH = patternIsSH;
            break;
          }
        }
        
        // SH packs display as "Grade A" in the invoice
        if (isSH) {
          grade = 'A';
        }
        
        // Extract specs (anything in parentheses) or add default specs for certain packs
        let specs = '';
        const specsMatch = pack.match(/\(([^)]+)\)/);
        if (specsMatch) {
          specs = `(${specsMatch[1]})`;
        } else {
          // Add default specs based on weight and whether it's SH or not
          if (weight === '13.5') {
            if (isSH) {
              // SH packs show as Grade A but with (7/8/9) specs
              specs = '(7/8/9)';
            } else if (grade === 'B') {
              specs = '(CL/4/5/6/7/8/9)';
            } else if (grade === 'A') {
              // 13.5kg Grade A always has (4/5/6)
              specs = '(4/5/6)';
            }
          }
          // Other weights (7.2kg, 6kg, 3kg) don't have specs
        }
        
        // Build description
        description = `Philippine Bananas ${weight} kg Grade ${grade}${specs ? ' ' + specs : ''}`.trim();
      } else {
        // Pineapples: "Philippine Pineapples LD {pack}"
        description = `Philippine Pineapples LD ${record.pack}`;
      }
      const priceKey = `${record.item}|${record.pack}|${record.supplier || ''}|${record.year}`;
      
      // Calculate unit price based on supplier and year
      let unitPrice = salesPrices.get(priceKey) || 0;
      
      // For LAPANDAY and MARSMAN in 2026, unit price = sales - purchase
      const supplier = (record.supplier || '').toUpperCase();
      if ((supplier === 'LAPANDAY' || supplier === 'MARSMAN') && record.year === 2026) {
        const salesPrice = salesPrices.get(priceKey) || 0;
        const purchasePrice = purchasePrices.get(priceKey) || 0;
        unitPrice = salesPrice - purchasePrice;
      }
      
      if (!items[description]) {
        items[description] = {
          description,
          qty: 0,
          unitPrice: unitPrice,
          amount: 0,
        };
      }
      
      items[description].qty += record.cartons;
      items[description].amount = items[description].qty * items[description].unitPrice;
    });

    // Sort items: Pineapples ascending, Bananas descending
    const sortedItems = Object.values(items).sort((a, b) => {
      const aIsPineapple = a.description.toUpperCase().includes('PINEAPPLE');
      const bIsPineapple = b.description.toUpperCase().includes('PINEAPPLE');
      
      // If both are pineapples, sort ascending by pack (extract number from pack like 8c, 9c)
      if (aIsPineapple && bIsPineapple) {
        // Extract pack number from description (e.g., "Philippine Pineapples LD 8c" -> 8)
        const aMatch = a.description.match(/(\d+)\s*c/i);
        const bMatch = b.description.match(/(\d+)\s*c/i);
        const aNum = aMatch ? parseInt(aMatch[1]) : 0;
        const bNum = bMatch ? parseInt(bMatch[1]) : 0;
        return aNum - bNum; // Ascending
      }
      
      // If both are bananas, sort descending by weight
      if (!aIsPineapple && !bIsPineapple) {
        // Extract weight from description (e.g., "Philippine Bananas 13.5 kg" -> 13.5)
        const aMatch = a.description.match(/(\d+\.?\d*)\s*kg/i);
        const bMatch = b.description.match(/(\d+\.?\d*)\s*kg/i);
        const aWeight = aMatch ? parseFloat(aMatch[1]) : 0;
        const bWeight = bMatch ? parseFloat(bMatch[1]) : 0;
        return bWeight - aWeight; // Descending
      }
      
      // If one is pineapple and one is banana, keep original order
      return 0;
    });

    return sortedItems;
  }, [records, salesPrices, purchasePrices]);

  const total = groupedItems.reduce((sum, item) => sum + item.amount, 0);

  // Get all unique containers
  const containers = [...new Set(records.map(r => r.container))];
  const containerDetails = containers.map(container => {
    const containerRecords = records.filter(r => r.container === container);
    const totalCartons = containerRecords.reduce((sum, r) => sum + r.cartons, 0);
    return { container, cartons: totalCartons };
  });

  // Format dates
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }).toUpperCase();
    } catch {
      return dateStr;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const renderPageContent = () => (
    <Page size="A4" style={styles.page}>
        {/* Top Header with Logo and Invoice Info */}
        <View style={styles.topHeader}>
          <View style={styles.logoSection}>
            <Image src={logoImage} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>AGSOUTH FRUITS PACIFIC BRANCH OFFICE</Text>
              <Text style={styles.companyAddress}>3rd Floor Unit B, Alpha Building, Lanang Business Park,</Text>
              <Text style={styles.companyAddress}>J.P. Laurel Avenue, Davao City 8000, Philippines</Text>
            </View>
          </View>
          <View style={styles.invoiceInfoTop}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceDetailsBox}>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceLabel}>INVOICE #:</Text>
                <Text style={styles.invoiceDetailNumber}>{invoiceNo}</Text>
              </View>
              <View style={[styles.invoiceDetailRow, styles.invoiceDetailRowLast]}>
                <Text style={styles.invoiceLabel}>DATE:</Text>
                <Text style={styles.invoiceDetail}>{formatDate(invoiceDate)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <Text style={styles.billToHeader}>BILL TO:</Text>
          <Text style={styles.billToCustomerName}>{customerName || 'N/A'}</Text>
          {customerName === 'Mohammed Abdallah Sharbatly Co Ltd' && (
            <>
              <Text style={styles.billToText}>P.O. Box 4150, Jeddah 21491, Saudi Arabia</Text>
            </>
          )}
          {customerName === 'Santito Brands Inc' && (
            <>
              <Text style={styles.billToText}>Km. 7 Lanang Business Park Davao City</Text>
            </>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColItem}>ITEM</Text>
            <Text style={styles.tableColQty}>QTY.</Text>
            <Text style={styles.tableColPrice}>UNIT PRICE</Text>
            <Text style={styles.tableColAmount}>AMOUNT</Text>
          </View>
          
          {groupedItems.map((item, index) => (
            <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={styles.tableColItem}>{item.description}</Text>
              <Text style={styles.tableColQty}>{item.qty.toLocaleString()}</Text>
              <Text style={styles.tableColPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.tableColAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Shipping Details - Compact Two Column Layout */}
        <View style={styles.detailsSection}>
          <View style={styles.detailsHeader}>
            <Text>SHIPPING & LOGISTICS INFORMATION</Text>
          </View>
          <View style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>WEEK NO.</Text>
              <Text style={styles.detailValue}>{week || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>TERM</Text>
              <Text style={styles.detailValue}>FOB</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SUPPLIER</Text>
              <Text style={styles.detailValue}>{supplier || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>CARRIER</Text>
              <Text style={styles.detailValue}>{sLine || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>BL No.</Text>
              <Text style={styles.detailValue}>{billingNo || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>VESSEL</Text>
              <Text style={styles.detailValue}>{vessel || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>POL</Text>
              <Text style={styles.detailValue}>{pol || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ETD</Text>
              <Text style={styles.detailValue}>{formatDate(etd)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>POD</Text>
              <Text style={styles.detailValue}>{destination || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ETA</Text>
              <Text style={styles.detailValue}>{formatDate(eta)}</Text>
            </View>
            <View style={styles.detailRowFull}>
              <Text style={styles.detailLabel}>CONTAINER NOS.</Text>
              <View style={styles.detailValue}>
                <View style={styles.containerList}>
                  {containerDetails.map((container, index) => (
                    <Text key={index} style={styles.containerItem}>
                      {container.container} - {container.cartons.toLocaleString()} CARTONS
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Beneficiary Details */}
        <View style={styles.beneficiarySection}>
          <View style={styles.beneficiaryHeader}>
            <Text>BENEFICIARY DETAILS</Text>
          </View>
          <View style={styles.beneficiaryContent}>
            {/* AGsouth Fruits Pacific Branch Office */}
            <View style={styles.beneficiaryRow}>
              <Text style={styles.beneficiaryLabel}>Beneficiary's Name:</Text>
              <Text style={styles.beneficiaryValue}>Agsouth Fruits Pacific Branch Office</Text>
            </View>
            <View style={styles.beneficiaryRow}>
              <Text style={styles.beneficiaryLabel}>Beneficiary's Address:</Text>
              <Text style={styles.beneficiaryValue}>Lanang Business Park, Km. 7 J.P. Laurel Ave., Davao City</Text>
            </View>
            <View style={styles.beneficiaryRow}>
              <Text style={styles.beneficiaryLabel}>Beneficiary's Account No.:</Text>
              <Text style={styles.beneficiaryValue}>300002133338</Text>
            </View>
            <View style={styles.beneficiaryRow}>
              <Text style={styles.beneficiaryLabel}>Beneficiary Bank:</Text>
              <Text style={styles.beneficiaryValue}>EastWest Banking Corporation</Text>
            </View>
            <View style={styles.beneficiaryRow}>
              <Text style={styles.beneficiaryLabel}>Swift Code:</Text>
              <Text style={styles.beneficiaryValue}>EWBCPHMM</Text>
            </View>
            <View style={[styles.beneficiaryRow, styles.beneficiaryRowLast]}>
              <Text style={styles.beneficiaryLabel}>Branch & Bank Address:</Text>
              <Text style={styles.beneficiaryValue}>Davao Bajada Branch, GF Uykimpang Building J.P Laurel Avenue Davao City</Text>
            </View>
          </View>
        </View>

        {/* Prepared By and Checked By - Below Beneficiary Details */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.preparedBy}>PREPARED BY :</Text>
            <Text style={styles.preparedByName}>Noel Jay Mallari</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.checkedBy}>CHECKED BY :</Text>
            <Text style={styles.checkedByName}>Ma. Levi Perez</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Divider line */}
          <View style={styles.footerDivider} />
          
          {/* Address */}
          <Text style={styles.footerAddress}>
            Davao Office: 3F Unit B&C Alpha Building, Lanang Business Park, Km. 7 J.P. Laurel Ave., Davao City 8000
          </Text>
          <Text style={styles.contactInfo}>Tele Fax No. +63 82 336 1128 | Email: davao@sharbatlyfruit.com.ph</Text>
        </View>
      </Page>
  );

  if (pageOnly) {
    return renderPageContent();
  }

  return (
    <Document>
      {renderPageContent()}
    </Document>
  );
};

export default InvoicePDF;
