import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

interface Taxpayer {
  id?: string;
  tin: string;
  vrn: string;
  businessName: string;
  tradeName: string;
  businessType: string;
  regionId: string;
  districtId: string;
  wardId: string;
  address: string;
  phone: string;
  email: string;
  isActive?: boolean;
}

interface EditTaxpayerProps {
  taxpayer: Taxpayer;
  businessTypes: string[] | { code: string; name: string }[];
  regions: any[];
  districts: any[];
  wards: any[];
  onClose: () => void;
  onSave: (updated: Taxpayer) => Promise<void>;
  fetchDistricts: (regionId: string) => Promise<void>;
  fetchWards: (districtId: string) => Promise<void>;
}

const EditTaxpayer: React.FC<EditTaxpayerProps> = ({
  taxpayer,
  businessTypes,
  regions,
  districts,
  wards,
  onClose,
  onSave,
  fetchDistricts,
  fetchWards,
}) => {
  const [form, setForm] = useState<Taxpayer>({ ...taxpayer });
  const [regionSearch, setRegionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...taxpayer });
  }, [taxpayer]);

  useEffect(() => {
    if (form.regionId) fetchDistricts(form.regionId);
    // eslint-disable-next-line
  }, [form.regionId]);

  useEffect(() => {
    if (form.districtId) fetchWards(form.districtId);
    // eslint-disable-next-line
  }, [form.districtId]);

  useEffect(() => {
    const region = regions.find(r => r.id === form.regionId)?.name || "";
    const district = districts.find(d => d.id === form.districtId)?.name || "";
    const ward = wards.find(w => w.id === form.wardId)?.name || "";
    const address = [ward, district, region].filter(Boolean).join(", ");
    setForm(f => ({ ...f, address }));
    // eslint-disable-next-line
  }, [form.regionId, form.districtId, form.wardId, regions, districts, wards]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  const filteredRegions = regions.filter(r =>
    r.name.toLowerCase().includes(regionSearch.toLowerCase())
  );
  const filteredDistricts = districts.filter(d =>
    d.name.toLowerCase().includes(districtSearch.toLowerCase())
  );
  const filteredWards = wards.filter(w =>
    w.name.toLowerCase().includes(wardSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-100 via-white to-blue-100 flex items-center justify-center z-50">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-3xl relative border-2 border-red-400">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-extrabold text-red-700 mb-6 text-center tracking-wide">
          Edit Taxpayer Details
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <input
              name="tin"
              placeholder="TIN"
              value={form.tin}
              className="border px-4 py-3 rounded-lg bg-gray-100 font-semibold"
              disabled
            />
            <input
              name="vrn"
              placeholder="VRN"
              value={form.vrn}
              className="border px-4 py-3 rounded-lg bg-gray-100 font-semibold"
              disabled
            />
            <input
              name="businessName"
              placeholder="Business Name"
              value={form.businessName}
              onChange={handleInputChange}
              className="border px-4 py-3 rounded-lg"
              required
            />
            <input
              name="tradeName"
              placeholder="Trade Name"
              value={form.tradeName}
              onChange={handleInputChange}
              className="border px-4 py-3 rounded-lg"
              required
            />
            <select
              name="businessType"
              value={form.businessType}
              onChange={handleInputChange}
              className="border px-4 py-3 rounded-lg"
              required
            >
              <option value="">Select Business Type</option>
              {businessTypes.map(type =>
                typeof type === "string"
                  ? <option key={type} value={type}>{type}</option>
                  : <option key={type.code} value={type.code}>{type.name}</option>
              )}
            </select>
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Search Region"
                value={regionSearch}
                onChange={e => setRegionSearch(e.target.value)}
                className="border px-4 py-2 rounded-lg mb-1"
              />
              <select
                name="regionId"
                value={form.regionId}
                onChange={handleInputChange}
                className="border px-4 py-3 rounded-lg"
                required
              >
                <option value="">Select Region</option>
                {filteredRegions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Search District"
                value={districtSearch}
                onChange={e => setDistrictSearch(e.target.value)}
                className="border px-4 py-2 rounded-lg mb-1"
                disabled={!form.regionId}
              />
              <select
                name="districtId"
                value={form.districtId}
                onChange={handleInputChange}
                className="border px-4 py-3 rounded-lg"
                required
                disabled={!form.regionId}
              >
                <option value="">Select District</option>
                {filteredDistricts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <input
                type="text"
                placeholder="Search Ward"
                value={wardSearch}
                onChange={e => setWardSearch(e.target.value)}
                className="border px-4 py-2 rounded-lg mb-1"
                disabled={!form.districtId}
              />
              <select
                name="wardId"
                value={form.wardId}
                onChange={handleInputChange}
                className="border px-4 py-3 rounded-lg"
                required
                disabled={!form.districtId}
              >
                <option value="">Select Ward</option>
                {filteredWards.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <input
              name="address"
              placeholder="Address"
              value={form.address}
              className="border px-4 py-3 rounded-lg col-span-2 bg-gray-100"
              readOnly
              required
            />
            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleInputChange}
              className="border px-4 py-3 rounded-lg"
              required
            />
            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleInputChange}
              className="border px-4 py-3 rounded-lg"
              required
            />
          </div>
          <div className="flex justify-center mt-4">
            <button
              type="submit"
              className="bg-gradient-to-r from-red-600 to-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:from-red-700 hover:to-blue-700 transition-all duration-200"
              disabled={saving}
            >
              {saving ? "Saving..." : "Update Taxpayer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaxpayer;