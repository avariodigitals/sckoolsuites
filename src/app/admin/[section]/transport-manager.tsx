"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";

type TabType = "vehicles" | "drivers" | "routes";

type Vehicle = {
  id: string;
  name: string;
  type: string;
  plateNumber: string;
  capacity: number;
  isActive: boolean;
  driverId: string | null;
  driverName: string | null;
  routeCount: number;
};

type Driver = {
  id: string;
  userId: string;
  name: string;
  email: string;
  licenseNumber: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  vehicleCount: number;
};

type RouteStop = {
  id: string;
  routeId: string;
  name: string;
  address: string;
  order: number;
  pickupTime: string | null;
};

type Route = {
  id: string;
  name: string;
  vehicleId: string | null;
  vehicleName: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
  isActive: boolean;
  stopCount: number;
  studentCount: number;
  stops: RouteStop[];
};

type AvailableUser = { id: string; name: string; email: string };

const emptyForms: Record<TabType, Record<string, string>> = {
  vehicles: { name: "", type: "BUS", plateNumber: "", capacity: "30", driverId: "" },
  drivers: { userId: "", licenseNumber: "", phone: "", address: "" },
  routes: { name: "", vehicleId: "", pickupTime: "", dropoffTime: "" },
};

export function TransportManager() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [, setRouteStops] = useState<RouteStop[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState<Record<string, string>>(emptyForms.vehicles);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState({ name: "", address: "", pickupTime: "" });
  const [showStopForm, setShowStopForm] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      if (activeTab === "vehicles") return vehicles;
      if (activeTab === "drivers") return drivers;
      if (activeTab === "routes") return routes;
    }
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case "vehicles":
        return vehicles.filter((v) =>
          v.name.toLowerCase().includes(query) ||
          v.plateNumber.toLowerCase().includes(query) ||
          v.type.toLowerCase().includes(query) ||
          v.driverName?.toLowerCase().includes(query)
        );
      case "drivers":
        return drivers.filter((d) =>
          d.name.toLowerCase().includes(query) ||
          d.licenseNumber.toLowerCase().includes(query) ||
          d.email.toLowerCase().includes(query)
        );
      case "routes":
        return routes.filter((r) =>
          r.name.toLowerCase().includes(query) ||
          r.vehicleName?.toLowerCase().includes(query)
        );
    }
  }, [vehicles, drivers, routes, activeTab, searchQuery]);

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/transport", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload?.error ?? "Unable to load transport data.");
        return;
      }
      setVehicles(payload.vehicles ?? []);
      setDrivers(payload.drivers ?? []);
      setRoutes(payload.routes ?? []);
      setRouteStops(payload.routeStops ?? []);
      setAvailableUsers(payload.availableUsers ?? []);
    } catch {
      setStatus("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Reset form when tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setForm(emptyForms[activeTab]);
      setShowForm(false);
      setShowStopForm(false);
      setSelectedRouteId(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab]);

  async function handleSubmit() {
    setStatus("");
    setSubmitting(true);

    const typeMap: Record<TabType, string> = {
      vehicles: "vehicle",
      drivers: "driver",
      routes: "route",
    };

    const body: Record<string, unknown> = { type: typeMap[activeTab], ...form };

    // Convert numeric fields
    if (activeTab === "vehicles" && body.capacity) {
      body.capacity = parseInt(body.capacity as string, 10);
    }

    try {
      const response = await fetch("/api/admin/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to create.");
        return;
      }

      setForm(emptyForms[activeTab]);
      setShowForm(false);
      setStatus("Created successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddStop() {
    if (!selectedRouteId || !stopForm.name.trim() || !stopForm.address.trim()) {
      setStatus("Please provide stop name and address.");
      return;
    }

    setStatus("");
    setSubmitting(true);

    try {
      const route = routes.find((r) => r.id === selectedRouteId);
      const nextOrder = route?.stops.length ?? 0;

      const response = await fetch("/api/admin/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "routeStop",
          routeId: selectedRouteId,
          name: stopForm.name,
          address: stopForm.address,
          pickupTime: stopForm.pickupTime || null,
          order: nextOrder,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to add stop.");
        return;
      }

      setStopForm({ name: "", address: "", pickupTime: "" });
      setShowStopForm(false);
      setStatus("Stop added successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!(await confirm({
      title: "Delete Record",
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    }))) {
      return;
    }

    const typeMap: Record<TabType, string> = {
      vehicles: "vehicle",
      drivers: "driver",
      routes: "route",
    };

    setStatus("");
    try {
      const response = await fetch(`/api/admin/transport/${id}?type=${typeMap[activeTab]}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete.");
        return;
      }

      setStatus("Deleted successfully.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  async function handleDeleteStop(stopId: string, stopName: string) {
    if (!(await confirm({
      title: "Delete Stop",
      message: `Delete stop "${stopName}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    }))) {
      return;
    }

    setStatus("");
    try {
      const response = await fetch(`/api/admin/transport/${stopId}?type=routeStop`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(payload?.error ?? "Failed to delete stop.");
        return;
      }

      setStatus("Stop deleted.");
      await loadData();
    } catch {
      setStatus("An error occurred.");
    }
  }

  const tabLabels: Record<TabType, string> = {
    vehicles: "Vehicles",
    drivers: "Drivers",
    routes: "Routes",
  };

  const renderForm = () => {
    switch (activeTab) {
      case "vehicles":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Vehicle Name *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="BUS">Bus</option>
              <option value="VAN">Van</option>
              <option value="CAR">Car</option>
              <option value="MINIBUS">Minibus</option>
              <option value="TRUCK">Truck</option>
            </select>
            <Input
              placeholder="Plate Number *"
              value={form.plateNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, plateNumber: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Capacity *"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.driverId}
              onChange={(e) => setForm((prev) => ({ ...prev, driverId: e.target.value }))}
            >
              <option value="">Assign Driver (optional)</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        );

      case "drivers":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.userId}
              onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
            >
              <option value="">Select User *</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <Input
              placeholder="License Number *"
              value={form.licenseNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, licenseNumber: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
        );

      case "routes":
        return (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Route Name *"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.vehicleId}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
            >
              <option value="">Assign Vehicle (optional)</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.plateNumber})</option>
              ))}
            </select>
            <Input
              type="time"
              placeholder="Pickup Time"
              value={form.pickupTime}
              onChange={(e) => setForm((prev) => ({ ...prev, pickupTime: e.target.value }))}
            />
            <Input
              type="time"
              placeholder="Dropoff Time"
              value={form.dropoffTime}
              onChange={(e) => setForm((prev) => ({ ...prev, dropoffTime: e.target.value }))}
            />
          </div>
        );
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading transport data...</div>;
  }

  const data = filteredData;

  return (
    <div className="space-y-4">
      {status && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${status.includes("success") || status.includes("Created") || status.includes("Deleted") || status.includes("Stop") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {status}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(Object.keys(tabLabels) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSearchQuery("");
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Search and Add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : `+ Add ${tabLabels[activeTab].slice(0, -1)}`}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Create New {tabLabels[activeTab].slice(0, -1)}
          </h3>
          {renderForm()}
          <div className="mt-3 flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Routes - Show Route Stops Management */}
      {activeTab === "routes" && selectedRouteId && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Route Stops: {routes.find((r) => r.id === selectedRouteId)?.name}
            </h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowStopForm(!showStopForm)}>
                {showStopForm ? "Cancel" : "+ Add Stop"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedRouteId(null)}>
                Close
              </Button>
            </div>
          </div>

          {showStopForm && (
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Stop Name *"
                value={stopForm.name}
                onChange={(e) => setStopForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Address *"
                value={stopForm.address}
                onChange={(e) => setStopForm((prev) => ({ ...prev, address: e.target.value }))}
              />
              <Input
                type="time"
                placeholder="Pickup Time"
                value={stopForm.pickupTime}
                onChange={(e) => setStopForm((prev) => ({ ...prev, pickupTime: e.target.value }))}
              />
              <div className="md:col-span-3 flex gap-2">
                <Button size="sm" onClick={handleAddStop} disabled={submitting}>
                  {submitting ? "Adding..." : "Add Stop"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(() => {
              const route = routes.find((r) => r.id === selectedRouteId);
              if (!route || route.stops.length === 0) {
                return <p className="text-center text-slate-500 py-4">No stops added yet.</p>;
              }
              return route.stops.map((stop, index) => (
                <div key={stop.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{stop.name}</p>
                      <p className="text-xs text-slate-500">{stop.address}</p>
                      {stop.pickupTime && <p className="text-xs text-blue-600">Pickup: {stop.pickupTime}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleDeleteStop(stop.id, stop.name)}>
                    Delete
                  </Button>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Data List */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          {tabLabels[activeTab]} ({data.length})
        </h3>
        <div className="space-y-3">
          {data.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No {activeTab} found. Create your first one!</p>
          ) : (
            data.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {"plateNumber" in item && (
                      <>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{item.name}</h4>
                          <span className="rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-700">{item.type}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Plate: {item.plateNumber} • Capacity: {item.capacity} seats
                          {item.driverName ? ` • Driver: ${item.driverName}` : ""}
                          {item.routeCount > 0 ? ` • Routes: ${item.routeCount}` : ""}
                        </p>
                      </>
                    )}
                    {"licenseNumber" in item && (
                      <>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{item.name}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{item.email}</p>
                        <p className="text-xs text-slate-600">License: {item.licenseNumber}</p>
                        {item.phone && <p className="text-xs text-slate-600">Phone: {item.phone}</p>}
                        {item.vehicleCount > 0 && <p className="text-xs text-slate-600">Assigned to {item.vehicleCount} vehicle(s)</p>}
                      </>
                    )}
                    {"pickupTime" in item && "stopCount" in item && (
                      <>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{item.name}</h4>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {item.vehicleName && <p className="text-xs text-slate-500">Vehicle: {item.vehicleName}</p>}
                        <p className="text-xs text-slate-600">
                          {item.pickupTime && `Pickup: ${item.pickupTime}`}
                          {item.pickupTime && item.dropoffTime && " • "}
                          {item.dropoffTime && `Dropoff: ${item.dropoffTime}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.stopCount} stop(s) • {item.studentCount} student(s)
                        </p>
                        {item.stops.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.stops.slice(0, 3).map((stop) => (
                              <span key={stop.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {stop.name}
                              </span>
                            ))}
                            {item.stops.length > 3 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                +{item.stops.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {"stopCount" in item && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRouteId(selectedRouteId === item.id ? null : item.id)}
                      >
                        {selectedRouteId === item.id ? "Hide Stops" : "Manage Stops"}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(item.id, item.name)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
