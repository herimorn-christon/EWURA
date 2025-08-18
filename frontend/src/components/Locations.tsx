import React, { useEffect, useState } from "react";
import apiService from "../services/api";
import { Plus, X, Search as SearchIcon, Pencil } from "lucide-react";
import DataTable from "react-data-table-component";

const TABS = ["Regions", "Districts", "Wards", "Streets"] as const;
type Tab = typeof TABS[number];

export default function Locations() {
  const [tab, setTab] = useState<Tab>("Regions");

  // Data states
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<Tab>("Regions");
  const [editItem, setEditItem] = useState<any>(null);

  // Form state
  const [form, setForm] = useState<any>({});

  // Search state
  const [search, setSearch] = useState("");

  // Fetch all data
  useEffect(() => {
    fetchCountries();
    fetchRegions();
    fetchDistricts();
    fetchWards();
    fetchStreets();
  }, []);

  const fetchCountries = async () => {
    const res = await apiService.getCountries();
    setCountries(res.data?.countries || []);
  };
  const fetchRegions = async () => {
    const res = await apiService.getRegions();
    setRegions(res.data?.regions || []);
  };
  const fetchDistricts = async () => {
    const res = await apiService.getDistricts();
    setDistricts(res.data?.districts || []);
  };
  const fetchWards = async () => {
    const res = await apiService.getWards();
    setWards(res.data?.wards || []);
  };
  // Fetch all streets
  const fetchStreets = async () => {
    const res = await apiService.getStreets();
    console.log("Fetched streets:", res.data?.streets);
    setStreets(res.data?.streets || []);
  };

  // Fetch streets by ward
  const fetchStreetsByWard = async (wardId: string) => {
    const res = await apiService.getStreets({ wardId });
    setStreets(res.data?.streets || []);
  };

  // Open modal for add/edit
  const openModal = (type: Tab, item: any = null) => {
    setModalType(type);
    setEditItem(item);
    setShowModal(true);
    if (item) {
      setForm(item);
    } else {
      let defaultForm: any = {};
      if (type === "Regions") {
        const tanzania = countries.find((c) => c.name?.toLowerCase() === "tanzania" || c.code === "TZ");
        defaultForm.countryId = tanzania?.id || "";
      }
      setForm(defaultForm);
    }
  };

  // Handle form change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalType === "Regions") {
      if (editItem) {
        await apiService.updateRegion(editItem.id, { name: form.name });
      } else {
        await apiService.createRegion({ code: form.code, name: form.name, countryId: form.countryId });
      }
      fetchRegions();
    }

    if (modalType === "Districts") {
      if (editItem) {
        await apiService.updateDistrict(editItem.id, { name: form.name });
      } else {
        await apiService.createDistrict({ code: form.code, name: form.name, regionId: form.regionId });
      }
      fetchDistricts();
    }

    if (modalType === "Wards") {
      if (editItem) {
        await apiService.updateWard(editItem.id, { name: form.name });
      } else {
        await apiService.createWard({ code: form.code, name: form.name, districtId: form.districtId });
      }
      fetchWards();
    }

    if (modalType === "Streets") {
      if (editItem) {
        await apiService.updateStreet(editItem.id, { name: form.name });
      } else {
        await apiService.createStreet({
          code: form.code,
          name: form.name,
          wardId: form.wardId,
        });
      }
      fetchStreets();
    }

    setShowModal(false);
    setEditItem(null);
    setForm({});
  };

  // DataTable columns for each tab
  const columns: Record<Tab, any[]> = {
    Regions: [
      { name: "Code", selector: (row: any) => row.code, sortable: true },
      { name: "Name", selector: (row: any) => row.name, sortable: true },
      {
        name: "Country",
        selector: (row: any) => countries.find((c) => c.id === row.countryId)?.name || "",
        sortable: true,
      },
      {
        name: "Actions",
        cell: (row: any) => (
          <button
            className="inline-flex items-center bg-white text-gray-800 px-3 py-1.5 rounded-md shadow hover:shadow-lg border border-gray-200 hover:bg-gray-50 transition focus:outline-none"
            onClick={() => openModal("Regions", row)}
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-gray-700" />
          </button>
        ),
      },
    ],
    Districts: [
      { name: "Code", selector: (row: any) => row.code, sortable: true },
      { name: "Name", selector: (row: any) => row.name, sortable: true },
      {
        name: "Region",
        selector: (row: any) => regions.find((r) => r.id === row.regionId)?.name || "",
        sortable: true,
      },
      {
        name: "Actions",
        cell: (row: any) => (
          <button
            className="inline-flex items-center bg-white text-gray-800 px-3 py-1.5 rounded-md shadow hover:shadow-lg border border-gray-200 hover:bg-gray-50 transition focus:outline-none"
            onClick={() => openModal("Districts", row)}
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-gray-700" />
          </button>
        ),
      },
    ],
    Wards: [
      { name: "Code", selector: (row: any) => row.code, sortable: true },
      { name: "Name", selector: (row: any) => row.name, sortable: true },
      {
        name: "District",
        selector: (row: any) => districts.find((d) => d.id === row.districtId)?.name || "",
        sortable: true,
      },
      {
        name: "Actions",
        cell: (row: any) => (
          <button
            className="inline-flex items-center bg-white text-gray-800 px-3 py-1.5 rounded-md shadow hover:shadow-lg border border-gray-200 hover:bg-gray-50 transition focus:outline-none"
            onClick={() => openModal("Wards", row)}
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-gray-700" />
          </button>
        ),
      },
    ],
    Streets: [
      { name: "Code", selector: (row: any) => row.code, sortable: true },
      { name: "Name", selector: (row: any) => row.name, sortable: true },
      {
        name: "Ward",
        selector: (row: any) => row.ward_name || wards.find((w) => w.id === row.ward_id || w.id === row.wardId)?.name || "",
        sortable: true,
      },
      {
        name: "Actions",
        cell: (row: any) => (
          <button
            className="inline-flex items-center bg-white text-gray-800 px-3 py-1.5 rounded-md shadow hover:shadow-lg border border-gray-200 hover:bg-gray-50 transition focus:outline-none"
            onClick={() => openModal("Streets", row)}
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-gray-700" />
          </button>
        ),
      },
    ],
  };

  // Render modal form fields
  const renderModalFields = () => {
    if (modalType === "Regions") {
      return (
        <>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Code</label>
              <input
                name="code"
                value={form.code || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded mb-2"
                placeholder="Region Code"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded mb-2"
              placeholder="Region Name"
              required
            />
          </div>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Country</label>
              <select
                name="countryId"
                value={form.countryId || countries.find((c) => c.name?.toLowerCase() === "tanzania" || c.code === "TZ")?.id || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select Country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      );
    }
    if (modalType === "Districts") {
      return (
        <>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Code</label>
              <input
                name="code"
                value={form.code || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded mb-2"
                placeholder="District Code"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded mb-2"
              placeholder="District Name"
              required
            />
          </div>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Region</label>
              <select
                name="regionId"
                value={form.regionId || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      );
    }
    if (modalType === "Wards") {
      return (
        <>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Code</label>
              <input
                name="code"
                value={form.code || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded mb-2"
                placeholder="Ward Code"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded mb-2"
              placeholder="Ward Name"
              required
            />
          </div>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">District</label>
              <select
                name="districtId"
                value={form.districtId || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select District</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      );
    }
    if (modalType === "Streets") {
      return (
        <>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Code</label>
              <input
                name="code"
                value={form.code || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded mb-2"
                placeholder="Street Code"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded mb-2"
              placeholder="Street Name"
              required
            />
          </div>
          {!editItem && (
            <div>
              <label className="block text-sm mb-1">Ward</label>
              <select
                name="wardId"
                value={form.wardId || ""}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                required
              >
                <option value="">Select Ward</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      );
    }
    return null;
  };

  // Data for DataTable with search filter
  const filteredDataMap: Record<Tab, any[]> = {
    Regions: regions.filter(
      (r) =>
        r.code?.toLowerCase().includes(search.toLowerCase()) ||
        r.name?.toLowerCase().includes(search.toLowerCase()) ||
        (countries.find((c) => c.id === r.countryId)?.name?.toLowerCase() || "").includes(search.toLowerCase())
    ),
    Districts: districts.filter(
      (d) =>
        d.code?.toLowerCase().includes(search.toLowerCase()) ||
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        (regions.find((r) => r.id === d.regionId)?.name?.toLowerCase() || "").includes(search.toLowerCase())
    ),
    Wards: wards.filter(
      (w) =>
        w.code?.toLowerCase().includes(search.toLowerCase()) ||
        w.name?.toLowerCase().includes(search.toLowerCase()) ||
        (districts.find((d) => d.id === w.districtId)?.name?.toLowerCase() || "").includes(search.toLowerCase())
    ),
    Streets: streets.filter(
      (s) =>
        s.code?.toLowerCase().includes(search.toLowerCase()) ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        (wards.find((w) => w.id === s.wardId)?.name?.toLowerCase() || "").includes(search.toLowerCase())
    ),
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Locations Management</h1>
      <div className="flex space-x-4 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-t-lg font-semibold ${
              tab === t ? "bg-red-600 text-white" : "bg-gray-200 text-black"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{tab}</h2>
          <button
            className="bg-red-600 text-white px-3 py-2 rounded flex items-center"
            onClick={() => openModal(tab)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add {tab.slice(0, -1)}
          </button>
        </div>
        <div className="mb-4 flex items-center">
          <SearchIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder={`Search ${tab.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <DataTable
          columns={columns[tab]}
          data={filteredDataMap[tab]}
          pagination
          highlightOnHover
          striped
          dense
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">
              {editItem ? "Edit" : "Add"} {modalType.slice(0, -1)}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {renderModalFields()}
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