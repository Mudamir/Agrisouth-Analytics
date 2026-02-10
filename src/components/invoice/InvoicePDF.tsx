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
    fontFamily: 'Roboto',
    fontSize: 8,
    backgroundColor: '#FFFFFF',
  },
  // Top Header with Logo and Invoice Info
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '2pt solid #19432a',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#19432a',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  companyAddress: {
    fontSize: 7,
    marginBottom: 1,
    color: '#333333',
  },
  invoiceInfoTop: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#19432a',
    marginBottom: 6,
    textAlign: 'right',
  },
  invoiceDetailsBox: {
    border: '1pt solid #19432a',
    padding: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 3,
    minWidth: 150,
    alignItems: 'flex-start',
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
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
  invoiceLabel: {
    fontSize: 7,
    color: '#666666',
    marginRight: 6,
    minWidth: 55,
    fontWeight: 'bold',
  },
  // Bill To Section
  billToSection: {
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    border: '1pt solid #E0E0E0',
    borderRadius: 4,
    padding: 6,
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
    marginTop: 6,
    marginBottom: 8,
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
    marginTop: 5,
    alignItems: 'flex-end',
    marginBottom: 6,
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
    marginTop: 5,
    border: '1pt solid #E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailsHeader: {
    backgroundColor: '#19432a',
    color: '#FFFFFF',
    padding: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsContent: {
    padding: 5,
    backgroundColor: '#FFFFFF',
  },
  detailRow: {
    flexDirection: 'row',
    padding: 3,
    marginBottom: 1,
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
    padding: 3,
    marginTop: 2,
    width: '100%',
    borderTop: '1pt solid #E0E0E0',
    paddingTop: 4,
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
    marginTop: 2,
  },
  containerItem: {
    fontSize: 7,
    color: '#333333',
    marginBottom: 1,
    paddingLeft: 0,
    lineHeight: 1.3,
  },
  // Footer
  footer: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: '1pt solid #E0E0E0',
    fontSize: 7,
    color: '#666666',
  },
  preparedBy: {
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#333333',
    fontSize: 8,
  },
  preparedByName: {
    marginBottom: 4,
    color: '#333333',
    fontSize: 8,
    marginLeft: 0,
  },
  contactInfo: {
    fontSize: 7,
    color: '#666666',
    marginBottom: 1,
  },
});

interface InvoicePDFProps {
  records: ShippingRecord[];
  invoiceNo: string;
  invoiceDate: string;
  salesPrices?: Map<string, number>; // Map of "item|pack|supplier|year" -> price
}

interface GroupedItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ records, invoiceNo, invoiceDate, salesPrices = new Map() }) => {
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
      const description = `Philippine ${record.item === 'BANANAS' ? 'Bananas' : 'Pineapples'} ${record.pack}`;
      const priceKey = `${record.item}|${record.pack}|${record.supplier || ''}|${record.year}`;
      const unitPrice = salesPrices.get(priceKey) || 0;
      
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

    return Object.values(items);
  }, [records, salesPrices]);

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Top Header with Logo and Invoice Info */}
        <View style={styles.topHeader}>
          <View style={styles.logoSection}>
            <Image src={logoImage} style={styles.logo} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>AGSOUTH FRUITS PACIFIC BRANCH OFFICE</Text>
              <Text style={styles.companyAddress}>3rd Floor Unit B, Alpha Building</Text>
              <Text style={styles.companyAddress}>Lanang Business Park</Text>
              <Text style={styles.companyAddress}>J.P. Laurel Avenue, Davao City 8000, Philippines</Text>
            </View>
          </View>
          <View style={styles.invoiceInfoTop}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceDetailsBox}>
              <View style={styles.invoiceDetailRow}>
                <Text style={styles.invoiceLabel}>INVOICE #:</Text>
                <Text style={styles.invoiceDetail}>{invoiceNo}</Text>
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
              <Text style={styles.billToText}>P.O. Box 4150</Text>
              <Text style={styles.billToText}>Jeddah 21491</Text>
              <Text style={styles.billToText}>Saudi Arabia</Text>
            </>
          )}
          {customerName === 'Santito Brands Inc' && (
            <>
              <Text style={styles.billToText}>[Company Address]</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.preparedBy}>PREPARED BY:</Text>
          <Text style={styles.preparedByName}>Noel Jay Mallari</Text>
          <Text style={styles.contactInfo}>Tel. No. (082) 298-2908</Text>
          <Text style={styles.contactInfo}>Email: davao@sharbatlyfruit.com.ph</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
