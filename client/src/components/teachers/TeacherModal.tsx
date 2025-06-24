import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import {
  createTeacher,
  updateTeacher,
  hideAddTeacherModal,
  hideEditTeacherModal,
  setLoading,
  fetchNextEmployeeId,
} from "../../redux/slices/teacherSlice";
import { fetchSubjects } from "../../redux/slices/subjectSlice";
import Modal from "../common/Modal";

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface TeacherModalProps {
  mode: "add" | "edit";
}

const TeacherModal: React.FC<TeacherModalProps> = ({ mode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { showAddModal, showEditModal, loading, selectedTeacher } = useSelector(
    (state: RootState) => state.teachers
  );
  const { subjects } = useSelector((state: RootState) => state.subjects);

  const isOpen = mode === "add" ? showAddModal : showEditModal;
  const modalTitle = mode === "add" ? "Add New Teacher" : "Edit Teacher";

  // Fetch subjects when modal opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSubjects());
      // Fetch and auto-fill the next employee ID for add mode
      if (mode === "add") {
        dispatch(fetchNextEmployeeId()).then((result) => {
          if (result.payload) {
            setFormData((prev) => ({
              ...prev,
              employeeId: result.payload as string
            }));
          }
        });
      }
    }
  }, [dispatch, isOpen, mode]);

  const [formData, setFormData] = useState({
    name: "",
    employeeId: "",
    department: "",
    email: "",
    phone: "",
    designation: "",
    experience: 0,
    qualification: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: "",
    },
    dateOfJoining: "",
    dateOfBirth: "",
    emergencyContact: {
      name: "",
      phone: "",
      relation: "",
    },
    subjects: [] as string[],
    status: "active" as "active" | "inactive",
  });

  const [selectedSubject, setSelectedSubject] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const departments = [
    "Mathematics",
    "Physics",
    "English",
    "Chemistry",
    "Biology",
    "History",
    "Geography",
    "Computer Science",
  ];

  // Populate form when selectedTeacher changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && selectedTeacher) {
      setFormData({
        name: selectedTeacher.name || "",
        employeeId: selectedTeacher.employeeId || "",
        department: selectedTeacher.department || "",
        email: selectedTeacher.email || "",
        phone: selectedTeacher.phone || "",
        designation: selectedTeacher.designation || "",
        experience: selectedTeacher.experience || 0,
        qualification: selectedTeacher.qualification || "",
        address: {
          street: selectedTeacher.address?.street || "",
          city: selectedTeacher.address?.city || "",
          state: selectedTeacher.address?.state || "",
          pincode: selectedTeacher.address?.pincode || "",
        },
        dateOfJoining: selectedTeacher.dateOfJoining ? selectedTeacher.dateOfJoining.split('T')[0] : "",
        dateOfBirth: selectedTeacher.dateOfBirth ? selectedTeacher.dateOfBirth.split('T')[0] : "",
        emergencyContact: {
          name: selectedTeacher.emergencyContact?.name || "",
          phone: selectedTeacher.emergencyContact?.phone || "",
          relation: selectedTeacher.emergencyContact?.relation || "",
        },
        subjects: [...(selectedTeacher.subjects || [])],
        status: selectedTeacher.status || (selectedTeacher.isActive ? "active" : "inactive"),
      });
    }
  }, [mode, selectedTeacher]);

  const resetForm = () => {
    setFormData({
      name: "",
      employeeId: "",
      department: "",
      email: "",
      phone: "",
      designation: "",
      experience: 0,
      qualification: "",
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
      },
      dateOfJoining: "",
      dateOfBirth: "",
      emergencyContact: {
        name: "",
        phone: "",
        relation: "",
      },
      subjects: [],
      status: "active",
    });
    setErrors({});
  };

  const handleClose = () => {
    if (mode === "add") {
      dispatch(hideAddTeacherModal());
    } else {
      dispatch(hideEditTeacherModal());
    }
    resetForm();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    // Handle nested object fields
    if (name.startsWith('address.') || name.startsWith('emergencyContact.')) {
      const [parent, field] = name.split('.') as ['address' | 'emergencyContact', string];
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [field]: value
        }
      }));
      // Clear error when user starts typing
      if (errors[`${parent}${field.charAt(0).toUpperCase()}${field.slice(1)}`]) {
        setErrors((prev) => ({ 
          ...prev, 
          [`${parent}${field.charAt(0).toUpperCase()}${field.slice(1)}`]: "" 
        }));
      }
    } else {
      // Handle top-level fields
      setFormData((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
  };

  const handleAddSubject = () => {
    if (selectedSubject && !formData.subjects.includes(selectedSubject)) {
      setFormData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, selectedSubject],
      }));
      setSelectedSubject("");
    }
  };

  const handleRemoveSubject = (subjectId: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s !== subjectId),
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.employeeId.trim())
      newErrors.employeeId = "Employee ID is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.designation.trim())
      newErrors.designation = "Designation is required";
    if (formData.experience < 0 || formData.experience > 50)
      newErrors.experience = "Experience must be between 0 and 50 years";
    if (!formData.qualification.trim())
      newErrors.qualification = "Qualification is required";
    if (!formData.address.street.trim())
      newErrors.addressStreet = "Street address is required";
    if (!formData.address.city.trim())
      newErrors.addressCity = "City is required";
    if (!formData.address.state.trim())
      newErrors.addressState = "State is required";
    if (
      !formData.address.pincode.trim() ||
      !/^\d{6}$/.test(formData.address.pincode)
    )
      newErrors.addressPincode = "Valid 6-digit pincode is required";
    if (!formData.dateOfJoining.trim())
      newErrors.dateOfJoining = "Date of joining is required";
    if (!formData.dateOfBirth.trim())
      newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.emergencyContact.name.trim())
      newErrors.emergencyContactName = "Emergency contact name is required";
    if (
      !formData.emergencyContact.phone.trim() ||
      !/^\d{10}$/.test(formData.emergencyContact.phone)
    )
      newErrors.emergencyContactPhone =
        "Valid emergency contact phone number is required";
    if (!formData.emergencyContact.relation.trim())
      newErrors.emergencyContactRelation =
        "Relation to emergency contact is required";
    if (formData.subjects.length === 0)
      newErrors.subjects = "At least one subject is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const teacherData = {
        ...formData,
        isActive: formData.status === 'active',
        avatar: formData.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
      };

      if (mode === "add") {
        await dispatch(createTeacher(teacherData as any)).unwrap().then((res) => {
          if (res.data.success) {
            setLoading(false);
          }
        });
      } else if (selectedTeacher?._id) {
        const updateData = {
          _id: selectedTeacher._id,
          id: selectedTeacher.id || selectedTeacher._id,
          ...teacherData,
        };
        await dispatch(updateTeacher(updateData)).unwrap();
      }
      
      handleClose();
    } catch (error) {
      console.error(`Failed to ${mode} teacher:`, error);
    }
  };

  const fieldIdPrefix = mode === "add" ? "" : "edit-";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label
              htmlFor={`${fieldIdPrefix}name`}
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
            >
              Full Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              id={`${fieldIdPrefix}name`}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`input w-full ${errors.name ? "input-error" : ""}`}
              placeholder="Enter teacher's full name"
            />
            {errors.name && (
              <p className="text-error-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Employee ID */}
          <div>
            <label
              htmlFor={`${fieldIdPrefix}employeeId`}
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
            >
              Employee ID <span className="text-error-500">*</span>
              {mode === "add" && (
                <span className="text-xs text-gray-500 ml-2">(Auto-generated)</span>
              )}
            </label>
            <input
              type="text"
              id={`${fieldIdPrefix}employeeId`}
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              readOnly={mode === "add"}
              className={`input w-full ${mode === "add" ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""} ${errors.employeeId ? "input-error" : ""}`}
              placeholder={mode === "add" ? "Auto-generating..." : "e.g., EMP001"}
            />
            {errors.employeeId && (
              <p className="text-error-500 text-xs mt-1">{errors.employeeId}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label
              htmlFor={`${fieldIdPrefix}department`}
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
            >
              Department <span className="text-error-500">*</span>
            </label>
            <select
              id={`${fieldIdPrefix}department`}
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className={`input w-full ${errors.department ? "input-error" : ""}`}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.department && (
              <p className="text-error-500 text-xs mt-1">{errors.department}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor={`${fieldIdPrefix}status`}
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
            >
              Status
            </label>
            <select
              id={`${fieldIdPrefix}status`}
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="input w-full"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor={`${fieldIdPrefix}email`}
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
            >
              Email Address <span className="text-error-500">*</span>
            </label>
            <input
              type="email"
              id={`${fieldIdPrefix}email`}
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input w-full ${errors.email ? "input-error" : ""}`}
              placeholder="teacher@school.edu"
            />
            {errors.email && (
              <p className="text-error-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor={`${fieldIdPrefix}phone`}
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
            >
              Phone Number <span className="text-error-500">*</span>
            </label>
            <input
              type="tel"
              id={`${fieldIdPrefix}phone`}
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`input w-full ${errors.phone ? "input-error" : ""}`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-error-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Subjects */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Subjects <span className="text-error-500">*</span>
          </label>
          <div className="flex gap-2 mb-3">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="input flex-1"
            >
              <option value="">Select Subject</option>
              {subjects.map((subject: Subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddSubject}
              className="btn btn-outline"
              disabled={!selectedSubject}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.subjects.map((subjectId: string, index) => (
              <span
                key={index}
                className="badge badge-secondary flex items-center gap-2"
              >
                {subjects.find((s: Subject) => s._id === subjectId)?.name || subjectId}
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(subjectId)}
                  className="hover:text-error-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          {errors.subjects && (
            <p className="text-error-500 text-xs mt-1">{errors.subjects}</p>
          )}
        </div>

        {/* Designation */}
        <div>
          <label
            htmlFor={`${fieldIdPrefix}designation`}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
          >
            Designation <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            id={`${fieldIdPrefix}designation`}
            name="designation"
            value={formData.designation}
            onChange={handleInputChange}
            className={`input w-full ${errors.designation ? "input-error" : ""}`}
            placeholder="Enter designation"
          />
          {errors.designation && (
            <p className="text-error-500 text-xs mt-1">{errors.designation}</p>
          )}
        </div>

        {/* Experience */}
        <div>
          <label
            htmlFor={`${fieldIdPrefix}experience`}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
          >
            Experience (Years) <span className="text-error-500">*</span>
          </label>
          <input
            type="number"
            id={`${fieldIdPrefix}experience`}
            name="experience"
            value={formData.experience}
            onChange={handleInputChange}
            className={`input w-full ${errors.experience ? "input-error" : ""}`}
            placeholder="Enter years of experience"
          />
          {errors.experience && (
            <p className="text-error-500 text-xs mt-1">{errors.experience}</p>
          )}
        </div>

        {/* Qualification */}
        <div>
          <label
            htmlFor={`${fieldIdPrefix}qualification`}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
          >
            Qualification <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            id={`${fieldIdPrefix}qualification`}
            name="qualification"
            value={formData.qualification}
            onChange={handleInputChange}
            className={`input w-full ${errors.qualification ? "input-error" : ""}`}
            placeholder="Enter qualification"
          />
          {errors.qualification && (
            <p className="text-error-500 text-xs mt-1">
              {errors.qualification}
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Address
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}street`}
                name="address.street"
                value={formData.address.street}
                onChange={handleInputChange}
                className={`input w-full ${errors.addressStreet ? "input-error" : ""}`}
                placeholder="Street"
              />
              {errors.addressStreet && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.addressStreet}
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}city`}
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                className={`input w-full ${errors.addressCity ? "input-error" : ""}`}
                placeholder="City"
              />
              {errors.addressCity && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.addressCity}
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}state`}
                name="address.state"
                value={formData.address.state}
                onChange={handleInputChange}
                className={`input w-full ${errors.addressState ? "input-error" : ""}`}
                placeholder="State"
              />
              {errors.addressState && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.addressState}
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}pincode`}
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleInputChange}
                className={`input w-full ${errors.addressPincode ? "input-error" : ""}`}
                placeholder="Pincode"
              />
              {errors.addressPincode && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.addressPincode}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Date of Joining */}
        <div>
          <label
            htmlFor={`${fieldIdPrefix}dateOfJoining`}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
          >
            Date of Joining <span className="text-error-500">*</span>
          </label>
          <input
            type="date"
            id={`${fieldIdPrefix}dateOfJoining`}
            name="dateOfJoining"
            value={formData.dateOfJoining}
            onChange={handleInputChange}
            className={`input w-full ${errors.dateOfJoining ? "input-error" : ""}`}
          />
          {errors.dateOfJoining && (
            <p className="text-error-500 text-xs mt-1">
              {errors.dateOfJoining}
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label
            htmlFor={`${fieldIdPrefix}dateOfBirth`}
            className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2"
          >
            Date of Birth <span className="text-error-500">*</span>
          </label>
          <input
            type="date"
            id={`${fieldIdPrefix}dateOfBirth`}
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            className={`input w-full ${errors.dateOfBirth ? "input-error" : ""}`}
          />
          {errors.dateOfBirth && (
            <p className="text-error-500 text-xs mt-1">{errors.dateOfBirth}</p>
          )}
        </div>

        {/* Emergency Contact */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Emergency Contact
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}emergencyContactName`}
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleInputChange}
                className={`input w-full ${errors.emergencyContactName ? "input-error" : ""}`}
                placeholder="Name"
              />
              {errors.emergencyContactName && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.emergencyContactName}
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}emergencyContactPhone`}
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleInputChange}
                className={`input w-full ${errors.emergencyContactPhone ? "input-error" : ""}`}
                placeholder="Phone"
              />
              {errors.emergencyContactPhone && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.emergencyContactPhone}
                </p>
              )}
            </div>
            <div>
              <input
                type="text"
                id={`${fieldIdPrefix}emergencyContactRelation`}
                name="emergencyContact.relation"
                value={formData.emergencyContact.relation}
                onChange={handleInputChange}
                className={`input w-full ${errors.emergencyContactRelation ? "input-error" : ""}`}
                placeholder="Relation"
              />
              {errors.emergencyContactRelation && (
                <p className="text-error-500 text-xs mt-1">
                  {errors.emergencyContactRelation}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 animate-spin"
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
                {mode === "add" ? "Creating..." : "Updating..."}
              </>
            ) : (
              mode === "add" ? "Create Teacher" : "Update Teacher"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TeacherModal;
