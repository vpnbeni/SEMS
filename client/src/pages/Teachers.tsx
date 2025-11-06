import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AppDispatch, RootState } from "../redux/store";
import {
  fetchTeachers,
  showAddTeacherModal,
  showEditTeacherModal,
  showDeleteTeacherModal,
  clearError,
  Teacher,
  FetchTeachersParams,
} from "../redux/slices/teacherSlice";
import AddTeacherModal from "../components/teachers/AddTeacherModal";
import EditTeacherModal from "../components/teachers/EditTeacherModal";
import DeleteTeacherModal from "../components/teachers/DeleteTeacherModal";
import ExportModal, { ExportFilters } from "../components/common/ExportModal";
import axios from "axios";

const Teachers: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { teachers, loading, error, pagination } = useSelector(
    (state: RootState) => state.teachers
  );
  console.log(teachers, "teachers");
  console.log(loading, "loading");
  console.log(error, "error");
  console.log(pagination, "pagination");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [joiningDateFrom, setJoiningDateFrom] = useState("");
  const [joiningDateTo, setJoiningDateTo] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  // Debounced filter states
  const [debouncedJoiningDateFrom, setDebouncedJoiningDateFrom] = useState("");
  const [debouncedJoiningDateTo, setDebouncedJoiningDateTo] = useState("");
  const [debouncedYearsOfExperience, setDebouncedYearsOfExperience] = useState("");

  // Debounce search term with 500ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce joining date filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJoiningDateFrom(joiningDateFrom);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [joiningDateFrom]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJoiningDateTo(joiningDateTo);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [joiningDateTo]);

  // Debounce years of experience filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedYearsOfExperience(yearsOfExperience);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [yearsOfExperience]);

  const fetchTeachersData = useCallback(() => {
    const params: FetchTeachersParams = {
      page: currentPage,
      limit: 50, // Fixed limit of 50 items per page
      search: debouncedSearchTerm || undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      isActive: statusFilter !== "all" ? statusFilter === "active" : undefined,
      joiningDateFrom: debouncedJoiningDateFrom || undefined,
      joiningDateTo: debouncedJoiningDateTo || undefined,
      minExperience: debouncedYearsOfExperience ? parseInt(debouncedYearsOfExperience) : undefined,
      sort: "-createdAt",
    };
    dispatch(fetchTeachers(params));
  }, [
    dispatch,
    currentPage,
    debouncedSearchTerm,
    selectedDepartment,
    statusFilter,
    debouncedJoiningDateFrom,
    debouncedJoiningDateTo,
    debouncedYearsOfExperience,
  ]);

  useEffect(() => {
    fetchTeachersData();
  }, [fetchTeachersData]);

  useEffect(() => {
    if (error) {
      console.error("Teacher error:", error);
      // You can add a toast notification here
      setTimeout(() => {
        dispatch(clearError());
      }, 5000);
    }
  }, [error, dispatch]);

  // Transform backend data to frontend format
  const transformTeacher = (teacher: Teacher): Teacher => ({
    ...teacher,
    id: teacher._id || teacher.id,
    status: teacher.isActive ? "active" : "inactive",
    avatar: teacher.profileImage
      ? teacher.name.charAt(0).toUpperCase()
      : teacher.name.charAt(0).toUpperCase(),
    // Keep subjects as-is (they can be either IDs or populated objects)
    subjects: teacher.subjects || [],
  });

  // Only use real teachers from API and transform them
  const displayTeachers = teachers ? teachers.map(transformTeacher) : [];
  console.log(displayTeachers, "displayTeachers");

  const departments = [
    "Mathematics",
    "Physics",
    "English",
    "Chemistry",
    "Biology",
    "History",
  ];

  // Event handlers
  const handleAddTeacher = () => {
    dispatch(showAddTeacherModal());
  };

  const handleEditTeacher = (teacher: Teacher) => {
    dispatch(showEditTeacherModal(teacher));
  };

  const handleViewTeacher = (teacher: Teacher) => {
    navigate(`/teachers/${teacher._id || teacher.id}`);
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    dispatch(showDeleteTeacherModal(teacher));
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleFetchPreview = async (filters: ExportFilters) => {
    try {
      const token = localStorage.getItem("token");

      // Build query params
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.department && filters.department !== "all") params.append("department", filters.department);
      if (filters.status && filters.status !== "all") {
        params.append("isActive", filters.status === "active" ? "true" : "false");
      }
      if (filters.joiningDateFrom) params.append("joiningDateFrom", filters.joiningDateFrom);
      if (filters.joiningDateTo) params.append("joiningDateTo", filters.joiningDateTo);
      if (filters.minExperience) params.append("minExperience", filters.minExperience);

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/export/teachers/preview?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch preview:", error);
      return { total: 0, filtered: 0 };
    }
  };

  const handleExportData = async (filters: ExportFilters, exportAll: boolean) => {
    try {
      const token = localStorage.getItem("token");

      // Build query params
      const params = new URLSearchParams();

      if (!exportAll) {
        if (filters.search) params.append("search", filters.search);
        if (filters.department && filters.department !== "all") params.append("department", filters.department);
        if (filters.status && filters.status !== "all") {
          params.append("isActive", filters.status === "active" ? "true" : "false");
        }
        if (filters.joiningDateFrom) params.append("joiningDateFrom", filters.joiningDateFrom);
        if (filters.joiningDateTo) params.append("joiningDateTo", filters.joiningDateTo);
        if (filters.minExperience) params.append("minExperience", filters.minExperience);
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/export/teachers?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <p className="text-error-700 dark:text-error-300">{error}</p>
        </div>
      )}

      {/* Header removed (top bar is dynamic) */}

      {/* Action Bar */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-secondary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExport}
                className="btn btn-outline"
                disabled={loading}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export
              </button>
              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="btn btn-outline"
                disabled={loading}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                More Filters
                <svg
                  className={`w-4 h-4 ml-2 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <button
                onClick={handleAddTeacher}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-2 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Teacher
                  </>
                )}
              </button>
            </div>
          </div>

          {/* More Filters Accordion */}
          {showMoreFilters && (
            <div className="mt-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input w-full"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Department Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="input w-full"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Joining Date From */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Joining Date From
                  </label>
                  <input
                    type="date"
                    value={joiningDateFrom}
                    onChange={(e) => setJoiningDateFrom(e.target.value)}
                    className="input w-full"
                  />
                </div>

                {/* Joining Date To */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Joining Date To
                  </label>
                  <input
                    type="date"
                    value={joiningDateTo}
                    onChange={(e) => setJoiningDateTo(e.target.value)}
                    className="input w-full"
                  />
                </div>

                {/* Years of Experience */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                    Min Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="input w-full"
                  />
                </div>

                {/* Clear Filters Button */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setSelectedDepartment("all");
                      setJoiningDateFrom("");
                      setJoiningDateTo("");
                      setYearsOfExperience("");
                    }}
                    className="btn btn-ghost w-full"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-primary-600 transition ease-in-out duration-150 cursor-not-allowed">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading teachers...
          </div>
        </div>
      )}

      {/* Teachers Table */}
      {!loading && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sr No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Teacher Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    OASIS ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    School Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayTeachers.map((teacher: Teacher, index: number) => (
                  <tr key={teacher.id || teacher._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(currentPage - 1) * 50 + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-sm font-bold text-white">
                            {teacher.avatar}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {teacher.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {teacher.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {teacher.employeeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {teacher.designation || teacher.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {teacher.address?.city || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${teacher.status === "active" ? "badge-success" : "badge-secondary"}`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditTeacher(teacher)}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleViewTeacher(teacher)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State for when no teachers match filters */}
      {!loading && displayTeachers.length === 0 && (
        <div className="card">
          <div className="card-content text-center py-12">
            <div className="w-24 h-24 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-secondary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
              No teachers found
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              {searchTerm || selectedDepartment !== "all" || statusFilter !== "all" || joiningDateFrom || joiningDateTo || yearsOfExperience
                ? "No teachers match your search criteria. Try adjusting your filters."
                : "Get started by adding your first teacher to the system."}
            </p>
            <button
              onClick={handleAddTeacher}
              className="btn btn-primary"
              disabled={loading}
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Teacher
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                disabled={currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * 50 + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 50, pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTeacherModal />
      <EditTeacherModal />
      <DeleteTeacherModal />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Teachers"
        onExport={handleExportData}
        onFetchPreview={handleFetchPreview}
        filterConfig={[
          {
            label: "Search",
            key: "search",
            type: "text",
            placeholder: "Search by name, email, or employee ID",
          },
          {
            label: "Department",
            key: "department",
            type: "select",
            options: [
              { label: "All Departments", value: "all" },
              ...departments.map((dept) => ({ label: dept, value: dept })),
            ],
          },
          {
            label: "Status",
            key: "status",
            type: "select",
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
          },
          {
            label: "Joining Date From",
            key: "joiningDateFrom",
            type: "date",
          },
          {
            label: "Joining Date To",
            key: "joiningDateTo",
            type: "date",
          },
          {
            label: "Min Years of Experience",
            key: "minExperience",
            type: "number",
            placeholder: "e.g., 5",
          },
        ]}
      />
    </div>
  );
};

export default Teachers;
