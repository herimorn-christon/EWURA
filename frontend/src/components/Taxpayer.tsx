import React, { useEffect, useState } from "react";
import apiService from "../services/api";
import { Plus, X, Search as SearchIcon, Pencil, CheckCircle2, XCircle } from "lucide-react";

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
  street_id:string,
  streetId: string; // <-- add this
  address: string;
  phone: string;
  email: string;
  isActive?: boolean; // <-- Add this line
}

export default function TaxpayerComponent() {
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Taxpayer | null>(null);
  const [form, setForm] = useState<Taxpayer>({
    tin: "",
    vrn: "",
    businessName: "",
    tradeName: "",
    businessType: "",
    regionId: "",
    districtId: "",
    wardId: "",
    street_id: "",
    streetId: "", // <-- add this
    address: "",
    phone: "",
    email: "",
  });
  const [regionSearch, setRegionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  const [streetSearch, setStreetSearch] = useState("");
  // const [street, setStreet] = useState<any>(null);
  // const [loading, setLoading] = useState(false);

  // Fetch all data
  useEffect(() => {
    fetchTaxpayers();
    fetchBusinessTypes();
    fetchRegions();
 
  }, []);

  const fetchTaxpayers = async () => {
    const res = await apiService.getTaxpayers();
    // Map snake_case to camelCase
    const mapped = (res.data?.taxpayers || res.data || []).map((t: any) => ({
      id: t.id,
      tin: t.tin,
      vrn: t.vrn,
      businessName: t.business_name,
      tradeName: t.trade_name,
      businessType: t.business_type,
      regionId: t.region_id,
      districtId: t.district_id,
      wardId: t.ward_id,
      address: t.address,
      phone: t.phone,
      email: t.email,
      isActive: t.is_active, // <-- Add this line
    }));
    setTaxpayers(mapped);
  };

  const fetchBusinessTypes = async () => {
    const res = await apiService.getBusinessTypes();
    setBusinessTypes(res.data?.businessTypes || []);
  };

  const fetchRegions = async () => {
    const res = await apiService.getRegions();
    setRegions(res.data?.regions || []);
  };

  const fetchDistricts = async (regionId: string) => {
    if (!regionId) {
      setDistricts([]);
      return;
    }
    const res = await apiService.getDistricts({ regionId });
    setDistricts(res.data?.districts || []);
  };

  const fetchWards = async (districtId: string) => {
    if (!districtId) {
      setWards([]);
      return;
    }
    const res = await apiService.getWards({ districtId });
    setWards(res.data?.wards || []);
  };

  // const fetchStreet = async (streetId: string) => {
  //   setLoading(true);
  //   try {
  //     const res = await apiService.getStreet(streetId);
  //     setStreet(res.data || res); // Adjust depending on your API response structure
  //   } catch (error) {
  //     setStreet(null);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Update address when region, district, or ward changes
  useEffect(() => {
    const region = regions.find(r => r.id === form.regionId)?.name || "";
    const district = districts.find(d => d.id === form.districtId)?.name || "";
    const ward = wards.find(w => w.id === form.wardId)?.name || "";
    const address = [ward, district, region].filter(Boolean).join(", ");
    setForm(f => ({ ...f, address }));
    // eslint-disable-next-line
  }, [form.regionId, form.districtId, form.wardId, regions, districts, wards]);

  // When region/district changes, fetch children
  useEffect(() => {
    if (form.regionId) fetchDistricts(form.regionId);
    else setDistricts([]);
    setForm(f => ({ ...f, districtId: "", wardId: "" }));
    // eslint-disable-next-line
  }, [form.regionId]);

  useEffect(() => {
    if (form.districtId) fetchWards(form.districtId);
    else setWards([]);
    setForm(f => ({ ...f, wardId: "" }));
    // eslint-disable-next-line
  }, [form.districtId]);

  useEffect(() => {
    if (form.wardId) {
      apiService.getStreets({ wardId: form.wardId }).then(res => {
        setStreets(res.data?.streets || []);
      });
    } else {
      setStreets([]);
    }
    setForm(f => ({ ...f, streetId: "" }));
    // eslint-disable-next-line
  }, [form.wardId]);

  const handleSearch = async () => {
    if (!search) {
      fetchTaxpayers();
      return;
    }
    const res = await apiService.searchTaxpayers(search);
    setTaxpayers(res.data?.taxpayers || []);
  };

  // Make search live
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line
  }, [search]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "streetId") {
      setForm({ ...form, streetId: value, street_id: value }); // keep both in sync
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const openModal = (item?: Taxpayer) => {
    setEditItem(item || null);
    setForm(
      item || {
        tin: "",
        vrn: "",
        businessName: "",
        tradeName: "",
        businessType: "",
        regionId: "",
        districtId: "",
        wardId: "",
        streetId: "", // <-- add this
        address: "",
        phone: "",
        email: "",
        street_id: "",
      }
    );
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, street_id: form.streetId }; // ensure street_id is set
    if (editItem && editItem.id) {
      await apiService.updateTaxpayer(editItem.id, payload);
    } else {
      await apiService.createTaxpayer(payload);
    }
    setShowModal(false);
    setEditItem(null);
    setForm({
      tin: "",
      vrn: "",
      businessName: "",
      tradeName: "",
      businessType: "",
      regionId: "",
      districtId: "",
      wardId: "",
      streetId: "",
      street_id: "",
      address: "",
      phone: "",
      email: "",
    });
    fetchTaxpayers();
  };

  // Filtered lists
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Taxpayers</h1>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center max-w-md w-full">
          <SearchIcon className="w-4 h-4 text-black-400 mr-2" />
          <input
            type="text"
            placeholder="Search taxpayers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-black-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {/* Remove manual search button for live search */}
        </div>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded flex items-center"
          onClick={() => openModal()}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Taxpayer
        </button>
      </div>

      {/* Table for taxpayer details */}
      <table className="w-full">
        <thead className="bg-black-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">TIN</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">VRN</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Business Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Trade Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Address</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Actions</th> {/* Add Actions column */}
          </tr>
        </thead>
        <tbody>
          {taxpayers.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-2">No records to display</td>
            </tr>
          ) : (
            taxpayers.map(t => (
              <tr key={t.id}>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.tin}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.vrn}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.businessName}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.tradeName}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.businessType}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.address}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.phone}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">{t.email}</td>
                <td className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider text-center space-x-2">
                  {/* Edit button */}
                  <button
                    className="inline-flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-2 transition-colors duration-150"
                    onClick={() => openModal(t)}
                    title="Edit"
                    type="button"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Activate/Deactivate button */}
                  <button
                    className={`inline-flex items-center justify-center rounded-full p-2 transition-colors duration-150 ${
                      t.isActive
                        ? 'bg-green-100 hover:bg-green-200 text-green-700'
                        : 'bg-black-100 hover:bg-black-200 text-black-700'
                    }`}
                    onClick={async () => {
                      await apiService.updateTaxpayer(t.id!, { is_active: !t.isActive });
                      fetchTaxpayers();
                    }}
                    title={t.isActive ? "Deactivate" : "Activate"}
                    type="button"
                  >
                    {t.isActive ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Modal */}
      {showModal && (
   <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl relative shadow-lg">
            <button
              className="absolute top-2 right-2 text-black-500 hover:text-black-700"
              onClick={() => setShowModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">
              {editItem ? "Edit" : "Add"} Taxpayer
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="tin"
                  placeholder="TIN"
                  value={form.tin}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                  disabled={!!editItem}
                />
                <input
                  name="vrn"
                  placeholder="VRN"
                  value={form.vrn}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                  disabled={!!editItem}
                />
                <input
                  name="businessName"
                  placeholder="Business Name"
                  value={form.businessName}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                />
                <input
                  name="tradeName"
                  placeholder="Trade Name"
                  value={form.tradeName}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                />
                <select
                  name="businessType"
                  value={form.businessType}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                >
                  <option value="">Select Business Type</option>
                  {businessTypes.map(type =>
                    typeof type === "string"
                      ? <option key={type} value={type}>{type}</option>
                      : <option key={type.code} value={type.code}>{type.name}</option>
                  )}
                </select>

                {/* Region search and select */}
                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="Search Region"
                    value={regionSearch}
                    onChange={e => setRegionSearch(e.target.value)}
                    className="border px-3 py-2 rounded mb-1"
                  />
                  <select
                    name="regionId"
                    value={form.regionId}
                    onChange={handleInputChange}
                    className="border px-3 py-2 rounded"
                    required
                  >
                    <option value="">Select Region</option>
                    {filteredRegions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* District search and select */}
                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="Search District"
                    value={districtSearch}
                    onChange={e => setDistrictSearch(e.target.value)}
                    className="border px-3 py-2 rounded mb-1"
                    disabled={!form.regionId}
                  />
                  <select
                    name="districtId"
                    value={form.districtId}
                    onChange={handleInputChange}
                    className="border px-3 py-2 rounded"
                    required
                    disabled={!form.regionId}
                  >
                    <option value="">Select District</option>
                    {filteredDistricts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Ward search and select */}
                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="Search Ward"
                    value={wardSearch}
                    onChange={e => setWardSearch(e.target.value)}
                    className="border px-3 py-2 rounded mb-1"
                    disabled={!form.districtId}
                  />
                  <select
                    name="wardId"
                    value={form.wardId}
                    onChange={handleInputChange}
                    className="border px-3 py-2 rounded"
                    required
                    disabled={!form.districtId}
                  >
                    <option value="">Select Ward</option>
                    {filteredWards.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Street search and select */}
                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="Search Street"
                    value={streetSearch}
                    onChange={e => setStreetSearch(e.target.value)}
                    className="border px-3 py-2 rounded mb-1"
                    disabled={!form.wardId}
                  />
                  <select
                    name="streetId"
                    value={form.streetId || ""}
                    onChange={handleInputChange}
                    className="border px-3 py-2 rounded"
                    required
                    disabled={!form.wardId}
                  >
                    <option value="">Select Street</option>
                    {streets
                      .filter(s => s.name.toLowerCase().includes(streetSearch.toLowerCase()))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>

                <input
                  name="address"
                  placeholder="Address"
                  value={form.address}
                  className="border px-3 py-2 rounded col-span-2 bg-black-100"
                  readOnly
                  required
                />
                <input
                  name="phone"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                />
                <input
                  name="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleInputChange}
                  className="border px-3 py-2 rounded"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full mt-2"
              >
                {editItem ? "Update" : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}