import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import {
  createTeacher,
  updateTeacher,
  hideAddTeacherModal,
  hideEditTeacherModal,
} from "../../redux/slices/teacherSlice";
import { fetchSubjects } from "../../redux/slices/subjectSlice";
import api from "../../services/api";
import Modal from "../common/Modal";

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface SchoolOption {
  schoolName: string;
  schoolCode: string;
}

interface TeacherModalProps {
  mode: "add" | "edit";
  onSuccess?: () => void;
}

const DESIGNATION_OPTIONS = [
  "Principal",
  "Vice Principal",
  "PGT",
  "TGT",
  "Others",
] as const;

const TeacherModal: React.FC<TeacherModalProps> = ({ mode, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showAddModal, showEditModal, loading, selectedTeacher } = useSelector(
    (state: RootState) => state.teachers
  );
  const { subjects } = useSelector((state: RootState) => state.subjects);

  const isOpen = mode === "add" ? showAddModal : showEditModal;
  const modalTitle = mode === "add" ? "Add New Teacher" : "Edit Teacher";

  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    designation: "",
    subjectId: "",
    subjectCode: "",
    schoolName: "",
    schoolCode: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    mobileNo: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchSubjects());
    setSchoolsLoading(true);
    api
      .get("/teachers/schools")
      .then((res) => {
        const data = res?.data?.data ?? [];
        setSchoolOptions(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Failed to fetch school options:", error);
        setSchoolOptions([]);
      })
      .finally(() => setSchoolsLoading(false));
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (mode !== "edit" || !selectedTeacher) return;
    const firstSubject = Array.isArray(selectedTeacher.subjects) ? selectedTeacher.subjects[0] : "";
    const subjectId = typeof firstSubject === "string" ? firstSubject : firstSubject?._id || "";
    const subjectCode =
      selectedTeacher.subjectCode
      || (typeof firstSubject === "object" ? firstSubject?.code : "")
      || "";

    setFormData({
      name: selectedTeacher.name || "",
      employeeId: selectedTeacher.employeeId || "",
      designation: selectedTeacher.designation || "",
      subjectId,
      subjectCode,
      schoolName: selectedTeacher.schoolName || "",
      schoolCode: selectedTeacher.schoolCode || "",
      bankName: selectedTeacher.bankName || "",
      accountNumber: selectedTeacher.accountNumber || "",
      ifscCode: selectedTeacher.ifscCode || "",
      mobileNo: selectedTeacher.mobileNo || selectedTeacher.phone || "",
    });
    if (typeof firstSubject === "object" && firstSubject?.name) {
      setSubjectSearch(`${firstSubject.name} (${firstSubject.code || ""})`.trim());
    } else {
      setSubjectSearch("");
    }
  }, [mode, selectedTeacher]);

  const schoolButtonItems = useMemo(() => {
    if (!formData.schoolName || schoolOptions.some((s) => s.schoolName === formData.schoolName)) {
      return schoolOptions;
    }
    return [{ schoolName: formData.schoolName, schoolCode: formData.schoolCode }, ...schoolOptions];
  }, [formData.schoolCode, formData.schoolName, schoolOptions]);

  const filteredSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter((subject: Subject) => {
      const name = String(subject.name || "").toLowerCase();
      const code = String(subject.code || "").toLowerCase();
      const combinedLabel = `${name} (${code})`;
      return name.includes(term) || code.includes(term) || combinedLabel.includes(term);
    });
  }, [subjectSearch, subjects]);

  const designationOptions = useMemo(() => {
    if (!formData.designation || DESIGNATION_OPTIONS.includes(formData.designation as typeof DESIGNATION_OPTIONS[number])) {
      return DESIGNATION_OPTIONS;
    }
    return [formData.designation, ...DESIGNATION_OPTIONS];
  }, [formData.designation]);

  const resetForm = () => {
    setFormData({
      name: "",
      employeeId: "",
      designation: "",
      subjectId: "",
      subjectCode: "",
      schoolName: "",
      schoolCode: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      mobileNo: "",
    });
    setErrors({});
  };

  const handleClose = () => {
    if (mode === "add") dispatch(hideAddTeacherModal());
    else dispatch(hideEditTeacherModal());
    resetForm();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericOnlyFields = new Set(["employeeId", "accountNumber", "mobileNo"]);
    const nextValue = numericOnlyFields.has(name) ? value.replace(/\D/g, "") : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubjectChange = (subjectId: string) => {
    const selected = subjects.find((s: Subject) => s._id === subjectId);
    setFormData((prev) => ({
      ...prev,
      subjectId,
      subjectCode: selected?.code || "",
    }));
    if (selected) {
      setSubjectSearch(`${selected.name} (${selected.code})`);
    }
    if (errors.subjectId) setErrors((prev) => ({ ...prev, subjectId: "" }));
  };

  const handleSchoolSelect = (school: SchoolOption) => {
    setFormData((prev) => ({
      ...prev,
      schoolName: school.schoolName,
      schoolCode: school.schoolCode,
    }));
    if (errors.schoolName || errors.schoolCode) {
      setErrors((prev) => ({ ...prev, schoolName: "", schoolCode: "" }));
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = "Teacher name is required";
    if (!formData.employeeId.trim()) nextErrors.employeeId = "OASIS ID is required";
    else if (!/^\d+$/.test(formData.employeeId.trim())) nextErrors.employeeId = "OASIS ID must contain digits only";
    if (!formData.designation.trim()) nextErrors.designation = "Designation is required";
    if (!formData.subjectId) nextErrors.subjectId = "Subject is required";
    if (!formData.schoolName.trim()) nextErrors.schoolName = "School is required";
    if (!formData.schoolCode.trim()) nextErrors.schoolCode = "School code is required";
    if (!formData.bankName.trim()) nextErrors.bankName = "Bank name is required";
    if (!formData.accountNumber.trim()) nextErrors.accountNumber = "Account number is required";
    else if (!/^\d+$/.test(formData.accountNumber.trim())) nextErrors.accountNumber = "Account number must contain digits only";
    if (!formData.ifscCode.trim()) nextErrors.ifscCode = "IFSC code is required";
    else if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(formData.ifscCode.trim())) {
      nextErrors.ifscCode = "Invalid IFSC code format";
    }
    if (!formData.mobileNo.trim()) nextErrors.mobileNo = "Mobile number is required";
    else if (!/^\d{10}$/.test(formData.mobileNo.trim())) {
      nextErrors.mobileNo = "Mobile number must be 10 digits";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      employeeId: formData.employeeId.trim().toUpperCase(),
      designation: formData.designation.trim(),
      subjects: [formData.subjectId],
      subjectCode: formData.subjectCode,
      schoolName: formData.schoolName.trim(),
      schoolCode: formData.schoolCode.trim(),
      bankName: formData.bankName.trim(),
      accountNumber: formData.accountNumber.trim(),
      ifscCode: formData.ifscCode.trim().toUpperCase(),
      mobileNo: formData.mobileNo.trim(),
      isActive: selectedTeacher?.isActive ?? true,
    };

    try {
      if (mode === "add") {
        await dispatch(createTeacher(payload as any)).unwrap();
      } else if (selectedTeacher?._id) {
        await dispatch(
          updateTeacher({
            ...payload,
            _id: selectedTeacher._id,
            id: selectedTeacher.id || selectedTeacher._id,
          } as any)
        ).unwrap();
      }
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error(`Failed to ${mode} teacher:`, error);
    }
  };

  const fieldIdPrefix = mode === "add" ? "" : "edit-";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor={`${fieldIdPrefix}name`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Teacher Name <span className="text-error-500">*</span>
            </label>
            <input id={`${fieldIdPrefix}name`} name="name" value={formData.name} onChange={handleInputChange} className={`input w-full ${errors.name ? "input-error" : ""}`} />
            {errors.name && <p className="text-error-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}employeeId`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              OASIS ID <span className="text-error-500">*</span>
            </label>
            <input id={`${fieldIdPrefix}employeeId`} name="employeeId" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.employeeId} onChange={handleInputChange} className={`input w-full ${errors.employeeId ? "input-error" : ""}`} />
            {errors.employeeId && <p className="text-error-500 text-xs mt-1">{errors.employeeId}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}designation`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Designation <span className="text-error-500">*</span>
            </label>
            <select
              id={`${fieldIdPrefix}designation`}
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
              className={`input w-full ${errors.designation ? "input-error" : ""}`}
            >
              <option value="">Select Designation</option>
              {designationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.designation && <p className="text-error-500 text-xs mt-1">{errors.designation}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}subjectId`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Subject <span className="text-error-500">*</span>
            </label>
            <input
              id={`${fieldIdPrefix}subjectSearch`}
              type="text"
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              placeholder="Search subject by name or code"
              className="input w-full mb-2"
            />
            <div className={`rounded-md border ${errors.subjectId ? "border-error-500" : "border-gray-300 dark:border-gray-600"} p-2`}>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredSubjects.length === 0 && (
                  <p className="text-sm text-gray-500 px-2 py-1">No matching subjects found.</p>
                )}
                {filteredSubjects.map((subject: Subject) => {
                  const active = formData.subjectId === subject._id;
                  return (
                    <button
                      key={subject._id}
                      type="button"
                      onClick={() => handleSubjectChange(subject._id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors ${active
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-primary-500"
                      }`}
                    >
                      <span className="font-medium">{subject.name}</span>
                      <span className={`ml-2 ${active ? "text-primary-100" : "text-gray-500 dark:text-gray-400"}`}>({subject.code})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {errors.subjectId && <p className="text-error-500 text-xs mt-1">{errors.subjectId}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}subjectCode`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Subject Code
            </label>
            <input id={`${fieldIdPrefix}subjectCode`} name="subjectCode" value={formData.subjectCode} readOnly className="input w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              School <span className="text-error-500">*</span>
            </label>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 min-h-[44px] max-h-40 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
              {schoolsLoading && <span className="text-xs text-gray-500">Loading schools...</span>}
              {!schoolsLoading && schoolButtonItems.length === 0 && <span className="text-xs text-gray-500">No schools found from candidates.</span>}
              {!schoolsLoading &&
                schoolButtonItems.map((school) => {
                  const active = formData.schoolName === school.schoolName;
                  return (
                    <button
                      key={`${school.schoolName}-${school.schoolCode}`}
                      type="button"
                      onClick={() => handleSchoolSelect(school)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${active ? "bg-primary-600 text-white border-primary-600" : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-primary-500"}`}
                    >
                      {school.schoolName}
                    </button>
                  );
                })}
              </div>
            </div>
            {errors.schoolName && <p className="text-error-500 text-xs mt-1">{errors.schoolName}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}schoolCode`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              School Code
            </label>
            <input id={`${fieldIdPrefix}schoolCode`} name="schoolCode" value={formData.schoolCode} readOnly className={`input w-full bg-gray-100 dark:bg-gray-800 cursor-not-allowed ${errors.schoolCode ? "input-error" : ""}`} />
            {errors.schoolCode && <p className="text-error-500 text-xs mt-1">{errors.schoolCode}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}bankName`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Bank Name <span className="text-error-500">*</span>
            </label>
            <input id={`${fieldIdPrefix}bankName`} name="bankName" value={formData.bankName} onChange={handleInputChange} className={`input w-full ${errors.bankName ? "input-error" : ""}`} />
            {errors.bankName && <p className="text-error-500 text-xs mt-1">{errors.bankName}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}accountNumber`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Account Number <span className="text-error-500">*</span>
            </label>
            <input id={`${fieldIdPrefix}accountNumber`} name="accountNumber" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.accountNumber} onChange={handleInputChange} className={`input w-full ${errors.accountNumber ? "input-error" : ""}`} />
            {errors.accountNumber && <p className="text-error-500 text-xs mt-1">{errors.accountNumber}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}ifscCode`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              IFSC Code <span className="text-error-500">*</span>
            </label>
            <input id={`${fieldIdPrefix}ifscCode`} name="ifscCode" value={formData.ifscCode} onChange={handleInputChange} className={`input w-full ${errors.ifscCode ? "input-error" : ""}`} />
            {errors.ifscCode && <p className="text-error-500 text-xs mt-1">{errors.ifscCode}</p>}
          </div>

          <div>
            <label htmlFor={`${fieldIdPrefix}mobileNo`} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Mobile No. <span className="text-error-500">*</span>
            </label>
            <input id={`${fieldIdPrefix}mobileNo`} name="mobileNo" type="text" inputMode="numeric" pattern="[0-9]*" value={formData.mobileNo} onChange={handleInputChange} className={`input w-full ${errors.mobileNo ? "input-error" : ""}`} />
            {errors.mobileNo && <p className="text-error-500 text-xs mt-1">{errors.mobileNo}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={handleClose} className="btn btn-outline" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (mode === "add" ? "Creating..." : "Updating...") : (mode === "add" ? "Create Teacher" : "Update Teacher")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TeacherModal;
