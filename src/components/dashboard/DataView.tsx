import { useState } from 'react';
import { ShippingRecord, FruitType } from '@/types/shipping';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
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
    <div className="flex-1 p-6 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">DATA MANAGEMENT</h1>
          <p className="text-muted-foreground">Add, view, and manage shipping records</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterItem} onValueChange={(v) => setFilterItem(v as FruitType | 'ALL')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Items</SelectItem>
              <SelectItem value="BANANAS">Bananas</SelectItem>
              <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="font-heading">Add New Shipping Record</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={newRecord.year}
                    onChange={(e) => setNewRecord({ ...newRecord, year: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={newRecord.week}
                    onChange={(e) => setNewRecord({ ...newRecord, week: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ETD</Label>
                  <Input
                    placeholder="MM/DD/YYYY"
                    value={newRecord.etd}
                    onChange={(e) => setNewRecord({ ...newRecord, etd: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>POL</Label>
                  <Select value={newRecord.pol} onValueChange={(v) => setNewRecord({ ...newRecord, pol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pols.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select value={newRecord.item} onValueChange={(v) => setNewRecord({ ...newRecord, item: v as FruitType, pack: '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANANAS">Bananas</SelectItem>
                      <SelectItem value="PINEAPPLES">Pineapples</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={newRecord.supplier} onValueChange={(v) => setNewRecord({ ...newRecord, supplier: v })}>
                    <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>S.Line</Label>
                  <Select value={newRecord.sLine} onValueChange={(v) => setNewRecord({ ...newRecord, sLine: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sLines.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Container</Label>
                  <Input
                    placeholder="XXXX1234567"
                    value={newRecord.container}
                    onChange={(e) => setNewRecord({ ...newRecord, container: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pack</Label>
                  <Select value={newRecord.pack} onValueChange={(v) => setNewRecord({ ...newRecord, pack: v })}>
                    <SelectTrigger><SelectValue placeholder="Select pack" /></SelectTrigger>
                    <SelectContent>
                      {packs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>L.Cont</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newRecord.lCont}
                    onChange={(e) => setNewRecord({ ...newRecord, lCont: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cartons</Label>
                  <Input
                    type="number"
                    value={newRecord.cartons}
                    onChange={(e) => setNewRecord({ ...newRecord, cartons: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newRecord.price}
                    onChange={(e) => setNewRecord({ ...newRecord, price: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>Add Record</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 border border-border rounded-lg overflow-hidden bg-card">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-primary text-primary-foreground">
              <TableRow>
                <TableHead className="text-primary-foreground">Year</TableHead>
                <TableHead className="text-primary-foreground">Week</TableHead>
                <TableHead className="text-primary-foreground">ETD</TableHead>
                <TableHead className="text-primary-foreground">POL</TableHead>
                <TableHead className="text-primary-foreground">Item</TableHead>
                <TableHead className="text-primary-foreground">Supplier</TableHead>
                <TableHead className="text-primary-foreground">S.Line</TableHead>
                <TableHead className="text-primary-foreground">Container</TableHead>
                <TableHead className="text-primary-foreground">Pack</TableHead>
                <TableHead className="text-primary-foreground">L.Cont</TableHead>
                <TableHead className="text-primary-foreground">Cartons</TableHead>
                <TableHead className="text-primary-foreground">Price</TableHead>
                <TableHead className="text-primary-foreground w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.slice(0, 200).map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>{record.year}</TableCell>
                  <TableCell>{record.week}</TableCell>
                  <TableCell>{record.etd}</TableCell>
                  <TableCell>{record.pol}</TableCell>
                  <TableCell className={record.item === 'BANANAS' ? 'text-gold font-medium' : 'text-accent font-medium'}>
                    {record.item}
                  </TableCell>
                  <TableCell>{record.supplier}</TableCell>
                  <TableCell>{record.sLine}</TableCell>
                  <TableCell className="font-mono text-xs">{record.container}</TableCell>
                  <TableCell>{record.pack}</TableCell>
                  <TableCell>{record.lCont}</TableCell>
                  <TableCell className="font-semibold">{record.cartons.toLocaleString()}</TableCell>
                  <TableCell>${record.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDelete(record.id);
                        toast.success('Record deleted');
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

      <p className="text-sm text-muted-foreground mt-2">
        Showing {Math.min(200, filteredData.length)} of {filteredData.length} records
      </p>
    </div>
  );
}
