import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
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

const Teachers: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { teachers, loading, error, pagination } = useSelector(
    (state: RootState) => state.teachers
  );
  console.log(teachers, "teachers");
  console.log(loading, "loading");
  console.log(error, "error");
  console.log(pagination, "pagination");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTeachersData = useCallback(() => {
    const params: FetchTeachersParams = {
      page: currentPage,
      limit: pagination.itemsPerPage,
      search: searchTerm || undefined,
      department: selectedDepartment !== "all" ? selectedDepartment : undefined,
      sort: "-createdAt",
    };
    dispatch(fetchTeachers(params));
  }, [
    dispatch,
    currentPage,
    searchTerm,
    selectedDepartment,
    pagination.itemsPerPage,
  ]);

  useEffect(() => {
    fetchTeachersData();
  }, [fetchTeachersData]);

  // Add debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on new search
      fetchTeachersData();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedDepartment, fetchTeachersData]);

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
    subjects: Array.isArray(teacher.subjects)
      ? teacher.subjects.map((s: any) =>
          typeof s === "string" ? s : s.name || s
        )
      : [],
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

  // Filter teachers based on search and department
  const filteredTeachers = (displayTeachers ?? []).filter(
    (teacher: Teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment =
        selectedDepartment === "all" ||
        teacher.department === selectedDepartment;
      return matchesSearch && matchesDepartment;
    }
  );

  // Event handlers
  const handleAddTeacher = () => {
    dispatch(showAddTeacherModal());
  };

  const handleEditTeacher = (teacher: Teacher) => {
    dispatch(showEditTeacherModal(teacher));
  };

  const handleViewTeacher = (teacher: Teacher) => {
    console.log("View teacher:", teacher);
    // TODO: Implement view teacher modal or navigate to teacher detail page
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    dispatch(showDeleteTeacherModal(teacher));
  };

  const handleExport = () => {
    console.log("Export teachers - Feature coming soon");
    // TODO: Implement export functionality
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <p className="text-error-700 dark:text-error-300">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900 dark:text-white mb-2">
              Teachers
            </h1>
            <p className="text-lg text-secondary-600 dark:text-secondary-400">
              Manage teacher information and assignments
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="badge badge-secondary">
              Total: {loading ? "..." : pagination.totalItems}
            </span>
            <span className="badge badge-success">
              Active:{" "}
              {loading
                ? "..."
                : displayTeachers.filter((t: Teacher) => t.status === "active")
                    .length}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="card mb-6">
        <div className="card-content ">
          <div className="flex flex-col lg:flex-row gap-4 items-start  lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 ">
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

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input w-full sm:w-auto"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
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

      {/* Teachers Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher: Teacher) => (
            <div
              key={teacher.id || teacher._id}
              className="card group hover:shadow-elegant transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="card-content">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-medium">
                      <span className="text-lg font-bold text-white">
                        {teacher.avatar}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                        {teacher.name}
                      </h3>
                      <p className="text-sm text-secondary-500 dark:text-secondary-400">
                        {teacher.employeeId}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`badge ${teacher.status === "active" ? "badge-success" : "badge-secondary"}`}
                  >
                    {teacher.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-secondary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm text-secondary-600 dark:text-secondary-300">
                      {teacher.department}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-secondary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                    <span className="text-sm text-secondary-600 dark:text-secondary-300">
                      {teacher.email}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4 text-secondary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <span className="text-sm text-secondary-600 dark:text-secondary-300">
                      {teacher.phone}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-2">
                      Subjects:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map(
                        (subject: string, index: number) => (
                          <span
                            key={index}
                            className="badge badge-outline text-xs"
                          >
                            {subject}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 mt-4 border-t border-secondary-200 dark:border-secondary-700">
                  <button
                    onClick={() => handleEditTeacher(teacher)}
                    className="btn btn-ghost text-xs px-3 py-1"
                    disabled={loading}
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleViewTeacher(teacher)}
                    className="btn btn-ghost text-xs px-3 py-1"
                    disabled={loading}
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteTeacher(teacher)}
                    className="btn btn-ghost text-xs px-3 py-1 text-error-600 dark:text-error-400"
                    disabled={loading}
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State for when no teachers match filters */}
      {!loading && filteredTeachers.length === 0 && (
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
              {searchTerm || selectedDepartment !== "all"
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
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-outline btn-sm"
          >
            Previous
          </button>

          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`btn btn-sm ${currentPage === page ? "btn-primary" : "btn-outline"}`}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, pagination.totalPages)
              )
            }
            disabled={currentPage === pagination.totalPages}
            className="btn btn-outline btn-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      <AddTeacherModal />
      <EditTeacherModal />
      <DeleteTeacherModal />
    </div>
  );
};

export default Teachers;
