import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { AppDispatch, RootState } from "../redux/store";
import {
  showAddTeacherModal,
  showEditTeacherModal,
  clearError,
  Teacher,
} from "../redux/slices/teacherSlice";
import AddTeacherModal from "../components/teachers/AddTeacherModal";
import EditTeacherModal from "../components/teachers/EditTeacherModal";
import ExportModal, { ExportFilters } from "../components/common/ExportModal";
import { useTeachers, teacherKeys } from "../hooks/useTeachers";
import toast from "react-hot-toast";
import { useCentreDetails } from "../hooks/useCentreDetails";
import teacherService from "../services/teacherService";



const DUTY_TYPE_OPTIONS = [
  'Centre Superintendent',
  'Deputy Centre Superintendent',
  'Observer',
  'Invigilator',
  'ASI (CCTV)',
  'ASI (Frisking Male)',
  'ASI (Frisking Female)',
  'Clerk',
  'Class IV',
];

const getDutyOptionsForDesignation = (designation: string | undefined): string[] => {
  const d = (designation || '').trim().toLowerCase();
  if (d === 'principal') return ['Centre Superintendent', 'Observer'];
  if (d === 'vice principal') return ['Centre Superintendent', 'Deputy Centre Superintendent'];
  return DUTY_TYPE_OPTIONS;
};

const LIMIT = 50;
const getTeacherId = (teacher: Teacher) => teacher._id || teacher.id || "";

const Teachers: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterSchoolCode, setFilterSchoolCode] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [joiningDateFrom] = useState("");
  const [joiningDateTo] = useState("");
  const [yearsOfExperience] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);
  const [isTemplateUploading, setIsTemplateUploading] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [dutyTypeOverrides, setDutyTypeOverrides] = useState<Record<string, string>>({});
  const [hiddenDeletedTeacherIds, setHiddenDeletedTeacherIds] = useState<Record<string, true>>({});
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Record<string, true>>({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [debouncedJoiningDateFrom, setDebouncedJoiningDateFrom] = useState("");
  const [debouncedJoiningDateTo, setDebouncedJoiningDateTo] = useState("");
  const [debouncedYearsOfExperience, setDebouncedYearsOfExperience] = useState("");
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const { data: centreDetails } = useCentreDetails();

  // Close filter dropdown on click outside
  useEffect(() => {
    if (!showMoreFilters) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowMoreFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreFilters]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedJoiningDateFrom(joiningDateFrom);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [joiningDateFrom]);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedJoiningDateTo(joiningDateTo);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [joiningDateTo]);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedYearsOfExperience(yearsOfExperience);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [yearsOfExperience]);

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      limit: LIMIT,
      search: debouncedSearchTerm || undefined,
      schoolCode: filterSchoolCode || undefined,
      subject: filterSubject || undefined,
      designation: filterDesignation || undefined,
      // Always fetch active functionaries for the main list.
      isActive: true,

      joiningDateFrom: debouncedJoiningDateFrom || undefined,
      joiningDateTo: debouncedJoiningDateTo || undefined,
      minExperience: debouncedYearsOfExperience ? parseInt(debouncedYearsOfExperience, 10) : undefined,
      sort: `${sortDirection === "desc" ? "-" : ""}${sortField}`,
    }),
    [
      currentPage,
      debouncedSearchTerm,
      filterSchoolCode,
      filterSubject,
      filterDesignation,

      debouncedJoiningDateFrom,
      debouncedJoiningDateTo,
      debouncedYearsOfExperience,
      sortField,
      sortDirection,
    ]
  );

  const { data, isLoading: loading, error: queryError } = useTeachers(queryParams);
  const teachers = data?.items ?? null;
  const pagination = data
    ? {
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalItems: data.totalItems,
      itemsPerPage: data.itemsPerPage,
    }
    : { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: LIMIT };
  const error = useSelector((state: RootState) => state.teachers.error) || queryError?.message || null;

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => dispatch(clearError()), 5000);
      return () => clearTimeout(t);
    }
  }, [error, dispatch]);

  const transformTeacher = (teacher: Teacher): Teacher => ({
    ...teacher,
    id: teacher._id || teacher.id,
    status: teacher.isActive ? "active" : "inactive",
    avatar: teacher.profileImage
      ? teacher.name.charAt(0).toUpperCase()
      : teacher.name.charAt(0).toUpperCase(),
    subjects: teacher.subjects || [],
  });

  const getPrimarySubjectName = (teacher: Teacher): string => {
    const firstSubject = Array.isArray(teacher.subjects) ? teacher.subjects[0] : null;
    if (firstSubject && typeof firstSubject === "object" && "name" in firstSubject) {
      return String((firstSubject as { name?: string }).name || "N/A");
    }
    return "N/A";
  };

  const getPrimarySubjectCode = (teacher: Teacher): string => {
    if (teacher.subjectCode) return teacher.subjectCode;
    const firstSubject = Array.isArray(teacher.subjects) ? teacher.subjects[0] : null;
    if (firstSubject && typeof firstSubject === "object" && "code" in firstSubject) {
      return String((firstSubject as { code?: string }).code || "N/A");
    }
    return "N/A";
  };

  const displayTeachers = useMemo(() => {
    if (!teachers) return [];

    const transformed = teachers
      .map(transformTeacher)
      // Hide soft-deleted functionaries even if API returns mixed records.
      .filter((teacher) => teacher.isActive !== false)
      // Optimistic UI: hide freshly deleted functionaries immediately.
      .filter((teacher) => !hiddenDeletedTeacherIds[teacher._id || teacher.id || '']);

    const needle = (debouncedSearchTerm || '').trim().toLowerCase();
    const schoolFilter = filterSchoolCode.trim().toLowerCase();
    const subjectFilter = filterSubject.trim().toLowerCase();
    const designationFilter = filterDesignation.trim().toLowerCase();

    let filtered = transformed;

    if (needle) {
      filtered = filtered.filter((teacher) => {
        const name = String(teacher.name || '').toLowerCase();
        const oasisId = String(teacher.oasisId || '').toLowerCase();
        const employeeId = String(teacher.employeeId || '').toLowerCase();
        const mobile = String(teacher.mobileNo || teacher.phone || '').toLowerCase();
        const schoolName = String(teacher.schoolName || '').toLowerCase();
        const schoolCode = String(teacher.schoolCode || '').toLowerCase();
        const subjectCode = getPrimarySubjectCode(teacher).toLowerCase();
        const subjectName = getPrimarySubjectName(teacher).toLowerCase();

        return (
          name.includes(needle) ||
          oasisId.includes(needle) ||
          employeeId.includes(needle) ||
          mobile.includes(needle) ||
          schoolName.includes(needle) ||
          schoolCode.includes(needle) ||
          subjectCode.includes(needle) ||
          subjectName.includes(needle)
        );
      });
    }

    if (schoolFilter) {
      filtered = filtered.filter((teacher) =>
        String(teacher.schoolCode || '').toLowerCase().includes(schoolFilter)
      );
    }

    if (subjectFilter) {
      filtered = filtered.filter((teacher) => {
        const subjectCode = getPrimarySubjectCode(teacher).toLowerCase();
        const subjectName = getPrimarySubjectName(teacher).toLowerCase();
        return subjectCode.includes(subjectFilter) || subjectName.includes(subjectFilter);
      });
    }

    if (designationFilter) {
      filtered = filtered.filter((teacher) =>
        String(teacher.designation || '').toLowerCase().includes(designationFilter)
      );
    }

    // Default sort: Principal first, then Vice Principal, then rest by name
    const designationPriority = (d: string | undefined): number => {
      const v = (d || '').trim().toUpperCase();
      if (v === 'PRINCIPAL') return 0;
      if (v === 'VICE PRINCIPAL') return 1;
      return 2;
    };

    return [...filtered].sort((a, b) => {
      const pa = designationPriority(a.designation);
      const pb = designationPriority(b.designation);
      if (pa !== pb) return pa - pb;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [teachers, hiddenDeletedTeacherIds, debouncedSearchTerm, filterSchoolCode, filterSubject, filterDesignation]);
  const visibleTeacherIds = useMemo(
    () => displayTeachers.map((teacher) => getTeacherId(teacher)).filter(Boolean),
    [displayTeachers]
  );
  const selectedTeacherList = useMemo(
    () => visibleTeacherIds.filter((id) => selectedTeacherIds[id]),
    [visibleTeacherIds, selectedTeacherIds]
  );
  const selectedCount = selectedTeacherList.length;
  const allVisibleSelected = visibleTeacherIds.length > 0 && selectedCount === visibleTeacherIds.length;

  const totalTeachers = pagination.totalItems ?? 0;
  const hiddenStillPresentCount = (teachers ?? []).reduce((count, teacher) => {
    const teacherId = teacher._id || teacher.id;
    if (teacherId && hiddenDeletedTeacherIds[teacherId]) {
      return count + 1;
    }
    return count;
  }, 0);
  const visibleTotalTeachers = Math.max(0, totalTeachers - hiddenStillPresentCount);
  const normalizeValue = (value: string | undefined) => String(value || "").trim().toLowerCase();
  const isSelfSchoolTeacher = (teacher: Teacher) => {
    const teacherSchoolCode = normalizeValue(teacher.schoolCode);
    const teacherSchoolName = normalizeValue(teacher.schoolName);
    const centreSchoolCode = normalizeValue(centreDetails?.centreSchoolCode);
    const centreName = normalizeValue(centreDetails?.centreName);

    if (centreSchoolCode) {
      return teacherSchoolCode === centreSchoolCode;
    }

    if (centreName) {
      return teacherSchoolName === centreName;
    }

    return false;
  };

  const activeCount = displayTeachers.filter((t) => isSelfSchoolTeacher(t)).length;
  const inactiveCount = Math.max(0, displayTeachers.length - activeCount);

  const invalidateTeachers = () => {
    queryClient.invalidateQueries({ queryKey: teacherKeys.all });
  };

  // Event handlers
  const handleAddTeacher = () => {
    dispatch(showAddTeacherModal());
  };

  const handleEditTeacher = (teacher: Teacher) => {
    dispatch(showEditTeacherModal(teacher));
  };
  const toggleTeacherSelection = (teacherId: string, checked: boolean) => {
    if (!teacherId) return;
    setSelectedTeacherIds((prev) => {
      const next = { ...prev };
      if (checked) next[teacherId] = true;
      else delete next[teacherId];
      return next;
    });
  };
  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedTeacherIds((prev) => {
      const next = { ...prev };
      visibleTeacherIds.forEach((teacherId) => {
        if (checked) next[teacherId] = true;
        else delete next[teacherId];
      });
      return next;
    });
  };
  const handleBulkDelete = async () => {
    if (selectedCount === 0 || isBulkDeleting) return;
    const confirmed = window.confirm(
      `Delete ${selectedCount} selected functionar${selectedCount === 1 ? "y" : "ies"}? This cannot be undone.`
    );
    if (!confirmed) return;
    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedTeacherList.map((teacherId) => teacherService.deleteById(teacherId))
      );
      const deletedIds: string[] = [];
      let failedCount = 0;
      results.forEach((result, index) => {
        if (result.status === "fulfilled") deletedIds.push(selectedTeacherList[index]);
        else failedCount += 1;
      });
      if (deletedIds.length > 0) {
        setHiddenDeletedTeacherIds((prev) => {
          const next = { ...prev };
          deletedIds.forEach((teacherId) => {
            next[teacherId] = true;
          });
          return next;
        });
        setSelectedTeacherIds((prev) => {
          const next = { ...prev };
          deletedIds.forEach((teacherId) => {
            delete next[teacherId];
          });
          return next;
        });
        toast.success(
          `${deletedIds.length} functionar${deletedIds.length === 1 ? "y" : "ies"} deleted successfully`
        );
        invalidateTeachers();
      }
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} selected functionar${failedCount === 1 ? "y" : "ies"}`);
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleFetchPreview = async (filters: ExportFilters) => {
    try {
      return await teacherService.getExportPreview(filters);
    } catch (error) {
      console.error("Failed to fetch preview:", error);
      return { total: 0, filtered: 0 };
    }
  };

  const handleExportData = async (filters: ExportFilters, exportAll: boolean) => {
    try {
      const blob = await teacherService.exportTeachersCsv(filters, exportAll);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([blob]));
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

  const downloadImportTemplate = async () => {
    try {
      setIsTemplateDownloading(true);
      const blob = await teacherService.downloadImportTemplate("csv");

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `exam_functionaries_template_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Template download failed:", error);
      alert("Failed to download template.");
    } finally {
      setIsTemplateDownloading(false);
    }
  };

  const uploadTemplateFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    try {
      setIsTemplateUploading(true);
      const response = await teacherService.uploadImportTemplate(selectedFile);

      const result = response?.data;
      const errorPreview = (result?.errors || [])
        .slice(0, 5)
        .map((item: { row: number; message: string }) => `Row ${item.row}: ${item.message}`)
        .join("\n");
      const warningCount = result?.warnings?.length ?? 0;
      alert(
        `Import completed.\nCreated: ${result?.created ?? 0}\nUpdated: ${result?.updated ?? 0}\nSkipped: ${result?.skipped ?? 0}\nErrors: ${result?.errors?.length ?? 0}\nWarnings: ${warningCount}${errorPreview ? `\n\nFirst errors:\n${errorPreview}` : ""}`
      );
      invalidateTeachers();
    } catch (error: any) {
      console.error("Template upload failed:", error);
      const message =
        error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || "Failed to upload CSV/XLSX template file.";
      alert(message);
    } finally {
      setIsTemplateUploading(false);
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

      {/* Stat cards (display only, like Datesheets – not clickable, small number animation) */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex flex-nowrap gap-6 min-w-max">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm min-w-[240px]">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-blue-50 text-blue-500 dark:bg-blue-900/20 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Functionaries</p>
              <span key={visibleTotalTeachers} className="text-xl font-bold text-gray-900 dark:text-white inline-block animate-number-in">{visibleTotalTeachers}</span>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm min-w-[240px]">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Self School</p>
              <span key={activeCount} className="text-xl font-bold text-gray-900 dark:text-white inline-block animate-number-in">{activeCount}</span>
              <span className="text-xs text-gray-400 font-medium ml-1">on this page</span>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm min-w-[240px]">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg flex-shrink-0 bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Outside School</p>
              <span key={inactiveCount} className="text-xl font-bold text-gray-900 dark:text-white inline-block animate-number-in">{inactiveCount}</span>
              <span className="text-xs text-gray-400 font-medium ml-1">on this page</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="card overflow-hidden">
        {/* Toolbar: search + actions (inside table card) */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 w-full max-w-md">
              <div className="relative">
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
            <div className="flex gap-3 flex-shrink-0">
              <input
                type="file"
                accept=".csv,.xlsx"
                id="teacher-template-upload-input"
                title="Upload teacher template file"
                aria-label="Upload teacher template file"
                onChange={uploadTemplateFile}
                className="hidden"
              />
              {/* Export button hidden for now */}
              {false && (
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
              )}
              <button
                onClick={downloadImportTemplate}
                className="btn btn-outline"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v10m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
                {isTemplateDownloading ? "Downloading..." : "Template"}
              </button>
              <button
                onClick={() => document.getElementById("teacher-template-upload-input")?.click()}
                className="btn btn-outline"
                disabled={loading || isTemplateDownloading || isTemplateUploading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V5m0 0l4 4m-4-4L8 9m-3 10h14" />
                </svg>
                {isTemplateUploading ? "Uploading..." : "Upload"}
              </button>
              <div className="relative" ref={filterDropdownRef}>
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

                {/* Filters Dropdown */}
                {showMoreFilters && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        School Code
                      </label>
                      <input
                        type="text"
                        value={filterSchoolCode}
                        onChange={(e) => setFilterSchoolCode(e.target.value)}
                        className="input w-full"
                        placeholder="e.g., 829261"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="input w-full"
                        placeholder="Code or name (e.g., 043, Chemistry)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={filterDesignation}
                        onChange={(e) => setFilterDesignation(e.target.value)}
                        className="input w-full"
                        placeholder="e.g., PGT, PRINCIPAL"
                      />
                    </div>
                  </div>
                )}
              </div>
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
                Add Functionary
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn-error"
                disabled={loading || isBulkDeleting || selectedCount === 0}
                title={selectedCount > 0 ? `Delete ${selectedCount} selected functionaries` : "Select functionaries first"}
              >
                {isBulkDeleting ? "Deleting..." : `Delete Selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-20rem)]">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    title="Select all functionaries on this page"
                    aria-label="Select all functionaries on this page"
                    checked={allVisibleSelected}
                    onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sr No
                </th>
                {[
                  { label: "Teacher Name", field: "name" },
                  { label: "OASIS ID", field: "oasisId" },
                  { label: "Duty Type", field: "dutyType" },
                  { label: "Designation", field: "designation" },
                  { label: "Subject Code", field: "subjectCode" },
                  { label: "Subject Name", field: "subjects" },
                  { label: "School Code", field: "schoolCode" },
                  { label: "School Name", field: "schoolName" },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors group"
                    onClick={() => {
                      if (sortField === field) {
                        setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                      } else {
                        setSortField(field);
                        setSortDirection("asc");
                      }
                      setCurrentPage(1);
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <span className={`inline-flex flex-col text-[8px] leading-none ${sortField === field ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"}`}>
                        <span className={sortField === field && sortDirection === "asc" ? "text-primary-600 dark:text-primary-400" : ""}>▲</span>
                        <span className={sortField === field && sortDirection === "desc" ? "text-primary-600 dark:text-primary-400" : ""}>▼</span>
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg
                        className="animate-spin h-10 w-10 text-primary-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Loading teachers...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayTeachers.map((teacher: Teacher, index: number) => (
                  <tr
                    key={teacher.id || teacher._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleEditTeacher(teacher)}
                  >
                    <td
                      className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        title={`Select ${teacher.name}`}
                        aria-label={`Select ${teacher.name}`}
                        checked={Boolean(selectedTeacherIds[getTeacherId(teacher)])}
                        onChange={(e) => toggleTeacherSelection(getTeacherId(teacher), e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
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
                            {String(teacher.name || "").toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {(() => {
                        const currentDuty =
                          dutyTypeOverrides[teacher._id || teacher.id!] ?? teacher.dutyType ?? "";
                        const duty = String(currentDuty).trim().toLowerCase();
                        const isClassIv = duty === "class iv";
                        const isOthers = duty === "others";
                        return isClassIv || isOthers ? "N/A" : teacher.oasisId || "—";
                      })()}
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const currentDuty = dutyTypeOverrides[teacher._id || teacher.id!] ?? teacher.dutyType ?? '';
                        if (currentDuty) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
                              {currentDuty}
                            </span>
                          );
                        }
                        return (
                          <select
                            title={`Duty type for ${teacher.name}`}
                            aria-label={`Duty type for ${teacher.name}`}
                            value=""
                            onChange={async (e) => {
                              const teacherId = teacher._id || teacher.id!;
                              const newDutyType = e.target.value;
                              if (!newDutyType) return;
                              setDutyTypeOverrides((prev) => ({ ...prev, [teacherId]: newDutyType }));
                              try {
                                await teacherService.update(teacherId, { dutyType: newDutyType } as any);
                                queryClient.invalidateQueries({ queryKey: teacherKeys.all });
                                toast.success(`Duty type updated for ${teacher.name}`);
                              } catch (err: any) {
                                setDutyTypeOverrides((prev) => { const next = { ...prev }; delete next[teacherId]; return next; });
                                toast.error(err?.response?.data?.message || 'Failed to update duty type');
                              }
                            }}
                            className="block min-w-[180px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white py-1.5 px-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select Duty</option>
                            {getDutyOptionsForDesignation(teacher.designation).map((duty: string) => (
                              <option key={duty} value={duty}>{duty}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {teacher.designation || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {getPrimarySubjectCode(teacher)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {getPrimarySubjectName(teacher)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {teacher.schoolCode || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {teacher.schoolName || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              {searchTerm || filterSchoolCode || filterSubject || filterDesignation
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
              Add Functionary
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
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
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
      <AddTeacherModal onSuccess={invalidateTeachers} />
      <EditTeacherModal onSuccess={invalidateTeachers} />
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
            label: "School Code",
            key: "schoolCode",
            type: "text",
            placeholder: "Filter by school code",
          },
          {
            label: "Subject",
            key: "subject",
            type: "text",
            placeholder: "Filter by subject code/name",
          },
          {
            label: "Designation",
            key: "designation",
            type: "text",
            placeholder: "Filter by designation",
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
