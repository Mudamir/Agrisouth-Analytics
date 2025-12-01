import { useState } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Download, Database } from 'lucide-react';
import { toast } from 'sonner';

interface DataViewProps {
  data: ShippingRecord[];
  onAdd: (record: Omit<ShippingRecord, 'id'>) => void;
  onDelete: (id: string) => void;
}

const suppliers = ['AGS PANABO', 'AGS SARAP', 'AGS TUPI', 'APR AGRI', 'LAPANDAY', 'MARSMAN', 'MARSMAN 2', 'NEW TOWN FRESH', 'PHILPACK'];
const sLines = ['CMA', 'MSC', 'ONE', 'PIL'];
const pols = ['DVO', 'GES'];
const bananaPacks = ['13.5 KG A', '13.5 KG B', '13.5 KG SH', '7.2 KG A', '3 KG A', '18 KG A'];
const pineapplePacks = ['12KG PACK'];

export function DataView({ data, onAdd, onDelete }: DataViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterItem, setFilterItem] = useState<FruitType | 'ALL'>('ALL');
  const [newRecord, setNewRecord] = useState({
    year: new Date().getFullYear(),
    week: 1,
    etd: '',
    pol: 'DVO',
    item: 'BANANAS' as FruitType,
    destination: 'DAMMAM',
    supplier: '',
    sLine: 'CMA',
    container: '',
    pack: '',
    lCont: 1,
    cartons: 0,
    price: 8.65,
  });

  const filteredData = filterItem === 'ALL' ? data : data.filter(r => r.item === filterItem);
  const packs = newRecord.item === 'BANANAS' ? bananaPacks : pineapplePacks;

  const handleSubmit = () => {
    if (!newRecord.supplier || !newRecord.container || !newRecord.pack || !newRecord.cartons) {
      toast.error('Please fill in all required fields');
      return;
    }

    onAdd(newRecord);
    setIsOpen(false);
    toast.success('Record added successfully');
    setNewRecord({
      year: new Date().getFullYear(),
      week: 1,
      etd: '',
      pol: 'DVO',
      item: 'BANANAS',
      destination: 'DAMMAM',
      supplier: '',
      sLine: 'CMA',
      container: '',
      pack: '',
      lCont: 1,
      cartons: 0,
      price: 8.65,
    });
  };

  const handleExport = () => {
    const headers = ['Year', 'Week', 'ETD', 'POL', 'Item', 'Destination', 'Supplier', 'S.Line', 'Container', 'Pack', 'L.Cont', 'Cartons', 'Price'];
    const rows = filteredData.map(r => [
      r.year, r.week, r.etd, r.pol, r.item, r.destination, r.supplier, r.sLine, r.container, r.pack, r.lCont, r.cartons, r.price
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipping_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Data exported successfully');
  };

  return (
    <div className="flex-1 p-8 overflow-hidden flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <p className="text-sm font-medium text-muted-foreground tracking-wide">Records & Management</p>
          <h1 className="page-title">Data</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterItem} onValueChange={(v) => setFilterItem(v as FruitType | 'ALL')}>
            <SelectTrigger className="w-40 bg-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Items</SelectItem>
              <SelectItem value="BANANAS">🍌 Bananas</SelectItem>
              <SelectItem value="PINEAPPLES">🍍 Pineapples</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport} className="bg-card border-border/50 hover:bg-muted">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border/50">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Add New Shipping Record</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Year</Label>
                  <Input
                    type="number"
                    value={newRecord.year}
                    onChange={(e) => setNewRecord({ ...newRecord, year: parseInt(e.target.value) })}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={newRecord.week}
                    onChange={(e) => setNewRecord({ ...newRecord, week: parseInt(e.target.value) })}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">ETD</Label>
                  <Input
                    placeholder="MM/DD/YYYY"
                    value={newRecord.etd}
                    onChange={(e) => setNewRecord({ ...newRecord, etd: e.target.value })}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">POL</Label>
                  <Select value={newRecord.pol} onValueChange={(v) => setNewRecord({ ...newRecord, pol: v })}>
                    <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Item</Label>
                  <Select value={newRecord.item} onValueChange={(v) => setNewRecord({ ...newRecord, item: v as FruitType, pack: '' })}>
                    <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANANAS">🍌 Bananas</SelectItem>
                      <SelectItem value="PINEAPPLES">🍍 Pineapples</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Supplier</Label>
                  <Select value={newRecord.supplier} onValueChange={(v) => setNewRecord({ ...newRecord, supplier: v })}>
                    <SelectTrigger className="bg-background border-border/50"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">S.Line</Label>
                  <Select value={newRecord.sLine} onValueChange={(v) => setNewRecord({ ...newRecord, sLine: v })}>
                    <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sLines.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Container</Label>
                  <Input
                    placeholder="XXXX1234567"
                    value={newRecord.container}
                    onChange={(e) => setNewRecord({ ...newRecord, container: e.target.value.toUpperCase() })}
                    className="bg-background border-border/50 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pack</Label>
                  <Select value={newRecord.pack} onValueChange={(v) => setNewRecord({ ...newRecord, pack: v })}>
                    <SelectTrigger className="bg-background border-border/50"><SelectValue placeholder="Select pack" /></SelectTrigger>
                    <SelectContent>
                      {packs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">L.Cont</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newRecord.lCont}
                    onChange={(e) => setNewRecord({ ...newRecord, lCont: parseFloat(e.target.value) })}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Cartons</Label>
                  <Input
                    type="number"
                    value={newRecord.cartons}
                    onChange={(e) => setNewRecord({ ...newRecord, cartons: parseInt(e.target.value) })}
                    className="bg-background border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newRecord.price}
                    onChange={(e) => setNewRecord({ ...newRecord, price: parseFloat(e.target.value) })}
                    className="bg-background border-border/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)} className="border-border/50">Cancel</Button>
                <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90 shadow-md">Add Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 rounded-xl overflow-hidden bg-card border border-border/50 shadow-card animate-fade-in" style={{ animationDelay: '100ms' }}>
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-primary">
              <TableRow className="hover:bg-primary">
                <TableHead className="text-primary-foreground font-semibold">Year</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Week</TableHead>
                <TableHead className="text-primary-foreground font-semibold">ETD</TableHead>
                <TableHead className="text-primary-foreground font-semibold">POL</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Item</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Supplier</TableHead>
                <TableHead className="text-primary-foreground font-semibold">S.Line</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Container</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Pack</TableHead>
                <TableHead className="text-primary-foreground font-semibold">L.Cont</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Cartons</TableHead>
                <TableHead className="text-primary-foreground font-semibold">Price</TableHead>
                <TableHead className="text-primary-foreground w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.slice(0, 200).map((record, index) => (
                <TableRow 
                  key={record.id} 
                  className="hover:bg-muted/30 transition-colors border-b border-border/30"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <TableCell className="font-medium">{record.year}</TableCell>
                  <TableCell>{record.week}</TableCell>
                  <TableCell className="text-muted-foreground">{record.etd}</TableCell>
                  <TableCell>{record.pol}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${record.item === 'BANANAS' ? 'bg-gold/20 text-gold' : 'bg-accent/20 text-accent'}`}>
                      {record.item === 'BANANAS' ? '🍌' : '🍍'} {record.item}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.supplier}</TableCell>
                  <TableCell>{record.sLine}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{record.container}</TableCell>
                  <TableCell>{record.pack}</TableCell>
                  <TableCell>{record.lCont}</TableCell>
                  <TableCell className="font-semibold text-foreground">{record.cartons.toLocaleString()}</TableCell>
                  <TableCell className="text-primary font-medium">${record.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDelete(record.id);
                        toast.success('Record deleted');
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>Showing {Math.min(200, filteredData.length)} of {filteredData.length} records</span>
        </div>
      </div>
    </div>
  );
}
