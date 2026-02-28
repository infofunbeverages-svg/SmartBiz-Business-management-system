import React, { useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TableView from '../../components/common/TableView';
import StatusBadge from '../../components/ui/StatusBadge';
import { Agency } from '../../types/models';
import { formatCurrency, formatDate } from '../../utils/formatters';

// Mock data - replace with actual API call
const agencies: Agency[] = [
  {
    id: '1',
    name: 'Central Distribution Agency',
    code: 'CDA001',
    address: '123 Main St, Colombo 03',
    phone: '011-2345678',
    email: 'central@example.com',
    status: 'active',
    region: 'Central',
    creditLimit: 1000000,
    currentCredit: 250000,
    registeredDate: '2024-01-15',
    lastOrderDate: '2024-03-20'
  },
  // Add more mock agencies here
];

const AgenciesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredAgencies = agencies.filter(agency => 
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agency.region.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const agencyColumns = [
    {
      header: 'Agency',
      accessorKey: 'name',
      cell: (agency: Agency) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-md flex items-center justify-center text-primary-600">
            <Building2 size={20} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{agency.name}</p>
            <p className="text-xs text-gray-500">Code: {agency.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Region',
      accessorKey: 'region',
    },
    {
      header: 'Contact',
      accessorKey: 'email',
      cell: (agency: Agency) => (
        <div>
          <p className="text-sm">{agency.email}</p>
          <p className="text-xs text-gray-500">{agency.phone}</p>
        </div>
      ),
    },
    {
      header: 'Credit Status',
      accessorKey: 'creditLimit',
      cell: (agency: Agency) => (
        <div>
          <p className="text-sm">{formatCurrency(agency.currentCredit)}</p>
          <p className="text-xs text-gray-500">
            Limit: {formatCurrency(agency.creditLimit)}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (agency: Agency) => <StatusBadge status={agency.status} />,
    },
    {
      header: 'Last Order',
      accessorKey: 'lastOrderDate',
      cell: (agency: Agency) => agency.lastOrderDate ? formatDate(agency.lastOrderDate) : '-',
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agency Management</h1>
          <p className="text-gray-500 mt-1">Manage your distribution agencies and their operations</p>
        </div>
        <Button leftIcon={<Plus size={16} />}>
          Register New Agency
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900">{agencies.length}</p>
              <p className="text-sm text-gray-500">Total Agencies</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-success-600">
                {agencies.filter(a => a.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">Active Agencies</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-primary-600">
                {formatCurrency(agencies.reduce((sum, agency) => sum + agency.currentCredit, 0))}
              </p>
              <p className="text-sm text-gray-500">Total Outstanding Credit</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Registered Agencies</CardTitle>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search agencies..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TableView
            data={filteredAgencies}
            columns={agencyColumns}
            emptyMessage="No agencies found"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AgenciesPage;