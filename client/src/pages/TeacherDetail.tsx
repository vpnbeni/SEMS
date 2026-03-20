import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../redux/store";
import { fetchTeachers, Teacher } from "../redux/slices/teacherSlice";

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { teachers, loading } = useSelector((state: RootState) => state.teachers);

  useEffect(() => {
    if (!teachers || teachers.length === 0) {
      dispatch(fetchTeachers({}));
    }
  }, [dispatch, teachers]);

  const teacher = teachers?.find((t: Teacher) => t._id === id || t.id === id);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center p-8">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-primary-600">
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
            Loading exam functionary details...
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
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
              Teacher not found
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              The teacher you're looking for doesn't exist or has been removed.
            </p>
            <button onClick={() => navigate("/teachers")} className="btn btn-primary">
              Back to Teachers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/teachers")}
          className="btn btn-ghost mb-4"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Exam Functionaries
          Back to Exam Functionaries
        </button>
        <h1 className="text-4xl font-bold text-secondary-900 dark:text-white">
          Teacher Details
        </h1>
      </div>

      {/* Teacher Profile Card */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-medium">
              <span className="text-3xl font-bold text-white">
                {teacher.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
                  {teacher.name}
                </h2>
                <span
                  className={`badge ${teacher.isActive || teacher.status === "active" ? "badge-success" : "badge-secondary"}`}
                >
                  {teacher.isActive || teacher.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-secondary-600 dark:text-secondary-400 mb-1">
                {teacher.designation}
              </p>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                OASIS ID: {teacher.employeeId}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Contact Information
            </h3>
            <div className="space-y-4">
              {(teacher.email || "").trim() && (
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
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
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Email</p>
                  <p className="text-secondary-900 dark:text-white">{teacher.email}</p>
                </div>
              </div>
              )}
              {(teacher.schoolName || teacher.schoolCode) && (
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-secondary-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">School</p>
                    <p className="text-secondary-900 dark:text-white">
                      {teacher.schoolName || "N/A"}{teacher.schoolCode ? ` (${teacher.schoolCode})` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Professional Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
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
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">School Code</p>
                  <p className="text-secondary-900 dark:text-white">{teacher.schoolCode || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Subject Code</p>
                  <p className="text-secondary-900 dark:text-white">{teacher.subjectCode || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Bank Name</p>
                  <p className="text-secondary-900 dark:text-white">
                    {teacher.bankName || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Account Number</p>
                  <p className="text-secondary-900 dark:text-white">
                    {teacher.accountNumber || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 1.343-3 3m6 0a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3V4m0 10v6"
                  />
                </svg>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">IFSC Code</p>
                  <p className="text-secondary-900 dark:text-white">{teacher.ifscCode || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subjects */}
        <div className="card">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Subjects Teaching
            </h3>
            <div className="flex flex-wrap gap-2">
              {teacher.subjects && teacher.subjects.length > 0 ? (
                teacher.subjects.map((subject: any, index: number) => (
                  <span key={index} className="badge badge-secondary">
                    {typeof subject === "string" ? subject : subject.name || subject.code || "Unknown"}
                  </span>
                ))
              ) : (
                <p className="text-secondary-500 dark:text-secondary-400">No subjects assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        {teacher.emergencyContact && (
          <div className="card">
            <div className="card-content">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                Emergency Contact
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-secondary-400 mt-0.5"
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
                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Name</p>
                    <p className="text-secondary-900 dark:text-white">
                      {teacher.emergencyContact.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-secondary-400 mt-0.5"
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
                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Phone</p>
                    <p className="text-secondary-900 dark:text-white">
                      {teacher.emergencyContact.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-secondary-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Relation</p>
                    <p className="text-secondary-900 dark:text-white">
                      {teacher.emergencyContact.relation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="card lg:col-span-2">
          <div className="card-content">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-secondary-400 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">Date of Birth</p>
                  <p className="text-secondary-900 dark:text-white">
                    {formatDate(teacher.dateOfBirth || "")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDetail;
