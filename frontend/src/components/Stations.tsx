import React, { useEffect, useState } from "react";
import apiService from "../services/api";
import { Plus, X, Search as SearchIcon, Pencil } from "lucide-react";

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
  streetId:string;
  isActive?: boolean; // <-- Add this line
}

interface Station {
  id?: string;
  code: string;
  name: string;
  taxpayerId: string;
  taxpayerName?: string;
  tin?: string;
  vrn?: string;
  regionName?: string;
  districtName?: string;
  wardName?: string;
  streetId: string;
  streetName?: string;
  address: string;
  ewuraLicenseNo: string;
  interfaceType?: string;
  interfaceTypeId?: string;
  coordinates?: any;
  isActive?: boolean;
  operationalHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Add to your existing interfaces
interface InterfaceType {
  id: string;
  name: string;
  code: string;
  description: string;
}

export default function Stations() {
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Taxpayer | null>(null);
  const [interfaceTypes, setInterfaceTypes] = useState<InterfaceType[]>([]);
  const [form, setForm] = useState<Station>({
    code: "",
    name: "",
    taxpayerId: "",
    regionId: "",
    districtId: "",
    wardId: "",
    streetId: "", // <-- always include this
    address: "",
    ewuraLicenseNo: "",
    email: "",
    interfaceTypeId: "",
  });
  const [regionSearch, setRegionSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  // Add a taxpayer search state
  const [taxpayerSearch, setTaxpayerSearch] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [streetSearch, setStreetSearch] = useState("");

  // Fetch all data
  useEffect(() => {
    fetchStations();
    fetchRegions();
  }, []);

  useEffect(() => {
    const fetchTaxpayers = async () => {
      const res = await apiService.getTaxpayers({ search: taxpayerSearch });
      setTaxpayers(res.data?.taxpayers || []);
    };
    fetchTaxpayers();
  }, [taxpayerSearch]);

  // First, update the interface types fetch
  useEffect(() => {
    const fetchInterfaceTypes = async () => {
      try {
        const response = await apiService.request('/interface-types');
        console.log('Raw interface types response:', response);
        
        // Check for the correct data structure from your screenshot
        if (response && response.data && Array.isArray(response.data)) {
          const types = response.data.map((type: any) => ({
            id: type.id,
            name: type.name,
            code: type.code,
            description: type.description
          }));
          console.log('Mapped interface types:', types);
          setInterfaceTypes(types);
        }
      } catch (error) {
        console.error('Failed to fetch interface types:', error);
      }
    };
    fetchInterfaceTypes();
  }, []);

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

  const fetchStations = async () => {
    const res = await apiService.getStations();
    console.log("Fetched stations:", res.data);
    
    const mapped = (res.data?.stations || []).map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      taxpayerId: s.taxpayer_id,
      taxpayerName: s.taxpayer_name,
      tin: s.tin,
      vrn: s.vrn,
      regionName: s.region_name,
      districtName: s.district_name,
      wardName: s.ward_name,
      streetId: s.street_id,
      streetName: s.street_name,
      address: s.address,
      ewuraLicenseNo: s.ewura_license_no,
      interfaceType: s.interface_type,
      interfaceTypeId: s.interface_type_id,
      coordinates: s.coordinates,
      isActive: s.is_active,
      operationalHours: s.operational_hours,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
    
    setStations(mapped);
  };

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

  // Fetch streets when ward changes
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
      fetchStations();
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
    console.log(`Updating ${name} to:`, value);
    setForm(prevForm => {
      const newForm = { ...prevForm, [name]: value };
      console.log('New form state:', newForm);
      return newForm;
    });
  };

  const openModal = (item?: Taxpayer | Station) => {
    setEditItem(item && "tin" in item ? item : null);
    if (item) {
      if ("tin" in item) {
        // Taxpayer
        setForm({
          ...form,
          code: "",
          name: item.businessName || "",
          taxpayerId: item.id || "",
          regionId: item.regionId || "",
          districtId: item.districtId || "",
          wardId: item.wardId || "",
          address: item.address || "",
          ewuraLicenseNo: "",
          email: item.email || "",
          interfaceTypeId: "", // Reset interface type
        });
      } else {
        // Station
        setForm({
          ...form,
          code: item.code || "",
          name: item.name || "",
          taxpayerId: item.taxpayerId || "",
          regionId: item.regionId || "",
          districtId: item.districtId || "",
          wardId: item.wardId || "",
          streetId: item.streetId || "",
          address: item.address || "",
          ewuraLicenseNo: item.ewuraLicenseNo || "",
          email: item.email || "",
          interfaceTypeId: item.interfaceTypeId || "", // Include interface type
        });
      }
    } else {
      setForm({
        code: "",
        name: "",
        taxpayerId: "",
        regionId: "",
        districtId: "",
        wardId: "",
        address: "",
        ewuraLicenseNo: "",
        email: "",
        streetId: "",
        interfaceTypeId: "", // Include interface type
      });
    }
    setShowModal(true);
  };

  // Update the handleSubmit function to explicitly include interfaceTypeId
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.interfaceTypeId || !form.streetId || !form.taxpayerId) {
      console.error('Missing required fields');
      return;
    }

    // Format payload for both create and update
    const payload = {
      code: form.code,
      name: form.name,
      taxpayer_id: form.taxpayerId,
      street_id: form.streetId,
      address: form.address,
      ewura_license_no: form.ewuraLicenseNo,
      interface_type_id: form.interfaceTypeId
    };

    try {
      let response;
      if (editItem && !('tin' in editItem) && editItem.id) {
        // Update existing station
        response = await apiService.updateStation(editItem.id, {
          ...payload,
          id: editItem.id // Include the ID for update
        });
      } else {
        // Create new station
        response = await apiService.createStation(payload);
      }

      if (response.error || !response.success) {
        throw new Error(response.message || 'Operation failed');
      }

      // Success handling
      setShowModal(false);
      setEditItem(null);
      setForm({
        code: "",
        name: "",
        taxpayerId: "",
        regionId: "",
        districtId: "",
        wardId: "",
        streetId: "",
        address: "",
        ewuraLicenseNo: "",
        email: "",
        interfaceTypeId: "",
      });
      await fetchStations(); // Refresh the list

    } catch (error: any) {
      console.error('Operation failed:', error);
      // You could add a toast notification here
      alert(error.message || 'Failed to save station');
    }
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
  const filteredStreets = streets.filter(s =>
    s.name.toLowerCase().includes(streetSearch.toLowerCase())
  );
  // Filter stations based on search input
  const filteredStations = stations.filter(
    s =>
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.ewuraLicenseNo.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Station Management</h1>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center max-w-md w-full">
          <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search stations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded flex items-center"
          onClick={() => openModal()}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add station
        </button>
      </div>

      {/* --- Stations Table --- */}
      <h2 className="text-xl font-bold mt-10 mb-4">Stations</h2>
      <table className="min-w-full border mt-2">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Code</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">EWURA License</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Taxpayer</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Interface Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-black-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStations.map(station => (
            <tr key={station.id}>
              <td className="px-6 py-3">{station.code}</td>
              <td className="px-6 py-3">{station.name}</td>
              <td className="px-6 py-3">{station.ewuraLicenseNo}</td>
              <td className="px-6 py-3">
                <div>
                  <div>{station.taxpayerName}</div>
                  <div className="text-xs text-gray-500">TIN: {station.tin}</div>
                </div>
              </td>
              <td className="px-6 py-3">{station.interfaceType}</td>
              <td className="px-6 py-3">
                <span className={`px-2 py-1 rounded-full text-xs ${station.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {station.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-3">
                <button
                  className="inline-flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full p-2 transition-colors duration-150"
                  onClick={() => openModal(station)}
                  title="Edit"
                  type="button"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* --- End stations table --- */}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl relative shadow-lg flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white z-10 rounded-t-lg">
              <h3 className="text-2xl font-bold">
                {editItem ? "Edit" : "Add"} Station
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body (scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
              {/* Basic Information Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-700">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Station Code</label>
                    <input
                      name="code"
                      placeholder="Enter station code"
                      value={form.code}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Station Name</label>
                    <input
                      name="name"
                      placeholder="Enter station name"
                      value={form.name}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">EWURA License</label>
                    <input
                      name="ewuraLicenseNo"
                      placeholder="Enter EWURA license number"
                      value={form.ewuraLicenseNo}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      Interface Type *
                    </label>
                    <select
                      name="interfaceTypeId"
                      value={form.interfaceTypeId || ''}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Interface Type</option>
                      {Array.isArray(interfaceTypes) && interfaceTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.code} - {type.name}
                        </option>
                      ))}
                    </select>
                    {/* Debug output */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Selected: {form.interfaceTypeId || 'none'}
                        <br />
                        Types available: {interfaceTypes.length}
                        <br />
                        Interface Types: {JSON.stringify(interfaceTypes)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-700">Location Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Region */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                      name="regionId"
                      value={form.regionId}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    >
                      <option value="">Select Region</option>
                      {filteredRegions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">District</label>
                    <select
                      name="districtId"
                      value={form.districtId}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                      disabled={!form.regionId}
                    >
                      <option value="">Select District</option>
                      {filteredDistricts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ward */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Ward</label>
                    <select
                      name="wardId"
                      value={form.wardId}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                      disabled={!form.districtId}
                    >
                      <option value="">Select Ward</option>
                      {filteredWards.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Street */}
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Street</label>
                    <select
                      name="streetId"
                      value={form.streetId}
                      onChange={handleInputChange}
                      className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                      disabled={!form.wardId}
                    >
                      <option value="">Select Street</option>
                      {filteredStreets.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Taxpayer Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-700">Taxpayer Information</h4>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Taxpayer</label>
                  <select
                    name="taxpayerId"
                    value={form.taxpayerId}
                    onChange={handleInputChange}
                    className="border px-4 py-2 rounded-md text-base focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  >
                    <option value="">Select Taxpayer</option>
                    {taxpayers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.businessName} (TIN: {t.tin})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address Preview */}
              <div>
                <h4 className="text-lg font-semibold mb-4 text-gray-700">Address Preview</h4>
                <input
                  name="address"
                  value={form.address}
                  className="w-full border px-4 py-2 rounded-md bg-gray-50 text-base"
                  readOnly
                />
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t mt-6">
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-lg font-semibold transition-colors"
                >
                  {editItem ? "Update Station" : "Create Station"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
