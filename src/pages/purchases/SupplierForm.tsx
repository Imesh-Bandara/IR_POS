import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SupplierAPI, SupplierPayload } from '../../features/purchases/supplier.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { token, hasPermission } = useAuthStore();

  const [formData, setFormData] = useState<SupplierPayload>({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_number: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && id && token) {
      loadSupplier(id);
    }
  }, [isEditing, id, token]);

  const loadSupplier = async (supplierId: string) => {
    try {
      setLoading(true);
      const supplier = await SupplierAPI.getSupplier(token!, supplierId);
      setFormData({
        company_name: supplier.company_name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        tax_number: supplier.tax_number || ''
      });
    } catch (err) {
      console.error('Failed to load supplier', err);
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.company_name) {
      alert("Company Name is required");
      return;
    }

    try {
      setLoading(true);
      if (isEditing && id) {
        await SupplierAPI.updateSupplier(token, id, formData);
      } else {
        await SupplierAPI.createSupplier(token, formData);
      }
      navigate('/suppliers');
    } catch (err) {
      console.error('Failed to save supplier', err);
      alert('Failed to save supplier: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission(isEditing ? 'suppliers.update' : 'suppliers.create')) {
    return <div className="p-6 text-center text-red-500">You do not have permission to access this page.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
        </h1>
        <button
          onClick={() => navigate('/suppliers')}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              name="company_name"
              required
              value={formData.company_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax / VAT Number</label>
              <input
                type="text"
                name="tax_number"
                value={formData.tax_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
