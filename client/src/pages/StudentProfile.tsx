import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Bus,
  CalendarDays,
  Download,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trophy,
  UserRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import attndService from "../services/attndService";

const dateText = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-GB") : "—";
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";
const Detail = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div>
    <p className="text-[11px] font-medium text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p>
  </div>
);

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/students/${id}`);
        const s = r.data?.data;
        if (!alive) return;
        setStudent(s);
        const results = await Promise.allSettled([
          api.get(`/actvt/students/${id}/profile`),
          s?.class && s?.section
            ? attndService.getStudentAttendance(s.class, s.section, {
                month: new Date().toISOString().slice(0, 7),
              })
            : Promise.resolve({ records: [] }),
        ]);
        if (!alive) return;
        if (results[0].status === "fulfilled")
          setActivity(results[0].value.data?.data);
        if (results[1].status === "fulfilled")
          setAttendance(
            results[1].value.records.filter(
              (x: any) => String(x.studentId) === String(id),
            ),
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);
  if (loading)
    return (
      <div className="p-6 text-sm text-slate-500">Loading student profile…</div>
    );
  if (!student)
    return (
      <div className="p-6 text-sm text-slate-500">
        Student record not found.
      </div>
    );
  const present = attendance.filter((x) => x.status === "present").length;
  const rate = attendance.length
    ? Math.round((present * 100) / attendance.length)
    : 0;
  const activities = activity?.activities || [];
  const certificates = activity?.certificates || [];
  const medals = activity?.medals || [];
  const achievements = [...medals, ...certificates];
  const address = [
    student.address?.street,
    student.address?.city,
    student.address?.state,
    student.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  const cards = [
    [
      CalendarDays,
      "Attendance",
      `${rate}%`,
      "This month",
      "text-blue-600 bg-blue-50",
    ],
    [
      BookOpen,
      "Subjects",
      String(student.subjects?.length || 0),
      "Enrolled",
      "text-indigo-600 bg-indigo-50",
    ],
    [
      Trophy,
      "Activities",
      String(activity?.metrics?.participationCount || 0),
      "Participations",
      "text-orange-600 bg-orange-50",
    ],
    [
      Award,
      "Achievements",
      String(medals.length),
      "Medals",
      "text-emerald-600 bg-emerald-50",
    ],
    [
      Award,
      "Certificates",
      String(certificates.length),
      "Certificates",
      "text-violet-600 bg-violet-50",
    ],
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate("/stdnt/students")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Students{" "}
          <span className="text-slate-300">/</span>{" "}
          <span className="text-slate-800">{student.name}</span>
        </button>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            <Download className="h-4 w-4" /> Download Profile
          </button>
          <button
            onClick={() =>
              navigate("/stdnt/students", { state: { editStudent: student } })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            <Pencil className="h-4 w-4" /> Edit Profile
          </button>
        </div>
      </header>
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-32 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/50 bg-blue-100 text-3xl font-bold text-blue-700">
            {student.profileImage ? (
              <img
                src={student.profileImage}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials(student.name)
            )}
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {student.isActive === false ? "Inactive" : "Active"}
              </span>
            </div>
            <p className="mt-3 text-blue-100">
              Class {student.class || "—"} · Section {student.section || "—"}
            </p>
            <p className="mt-1 text-sm font-semibold">
              Admission No. {student.rollNumber || "—"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-white/10 px-3 py-2">
                Roll No. {student.classRollNo || "—"}
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-2">
                {student.gender || "—"}
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-2">
                DOB {dateText(student.dateOfBirth)}
              </span>
            </div>
          </div>
          <div className="grid min-w-[230px] gap-3 border-l border-white/15 pl-5 text-sm">
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4" />{" "}
              {student.phone || student.guardianPhone || "Phone not provided"}
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4" />{" "}
              {student.email || "Email not provided"}
            </p>
            <p className="flex items-center gap-3">
              <UserRound className="h-4 w-4" />{" "}
              {student.fatherName ||
                student.guardianName ||
                "Guardian not provided"}
            </p>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-5">
        {cards.map(([Icon, label, value, hint, tone]: any) => (
          <div key={label} className="rounded-xl border border-slate-100 p-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-[11px] text-slate-400">{hint}</p>
          </div>
        ))}
      </section>
      <nav className="flex gap-5 overflow-x-auto border-b border-slate-200 px-2 text-sm font-medium text-slate-500">
        <span className="border-b-2 border-blue-600 px-1 py-3 text-blue-700">
          Overview
        </span>
        <span className="px-1 py-3">Academic</span>
        <span className="px-1 py-3">Attendance</span>
        <span className="px-1 py-3">Activities</span>
        <span className="px-1 py-3">Achievements</span>
        <span className="px-1 py-3">Documents</span>
      </nav>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Personal Details</h2>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
            <Detail label="Admission No." value={student.rollNumber} />
            <Detail
              label="Date of Birth"
              value={dateText(student.dateOfBirth)}
            />
            <Detail label="Roll No." value={student.classRollNo} />
            <Detail label="Gender" value={student.gender} />
            <Detail
              label="Class & Section"
              value={`${student.class || "—"} · ${student.section || "—"}`}
            />
            <Detail
              label="Blood Group"
              value={student.medicalInfo?.bloodGroup}
            />
            <Detail label="Category" value={student.category} />
            <Detail label="Nationality" value={student.nationality} />
            <Detail label="Religion" value={student.religion} />
            <Detail label="PEN No." value={student.penNumber} />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Family Details</h2>
          <div className="mt-5 space-y-5">
            <Detail label="Father" value={student.fatherName} />
            <Detail label="Mother" value={student.motherName} />
            <Detail label="Guardian Phone" value={student.guardianPhone} />
          <Detail label="Address" value={address} />
          </div>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Attendance</h2>
          <p className="mt-3 text-3xl font-bold text-blue-700">{rate}%</p>
          <p className="text-sm text-slate-500">
            {present} present out of {attendance.length} marked days this month
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${rate}%` }}
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Subjects Enrolled</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {student.subjects?.length ? (
              student.subjects.map((s: any) => (
                <span
                  key={s._id}
                  className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                >
                  {s.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No subjects assigned yet.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">House & Transport</h2>
          <div className="mt-4 space-y-4">
            <Detail label="House" value={student.house} />
            <Detail label="Bus / Route" value={student.busNo} />
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Bus className="h-4 w-4" /> Driver and stop details are not
              recorded.
            </p>
          </div>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Recent Activities</h2>
          <div className="mt-4 space-y-3">
            {activities.length ? (
              activities.slice(0, 5).map((a: any) => (
                <div key={a._id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold">{a.title || "Activity"}</p>
                  <p className="text-xs text-slate-500">
                    {dateText(a.date)} ·{" "}
                    {a.role || a.activityType || "Participant"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No participation records yet.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Awards & Achievements</h2>
          <div className="mt-4 space-y-3">
            {achievements.length ? (
              achievements.slice(0, 5).map((a: any, i: number) => (
                <div key={a._id || i} className="rounded-xl bg-amber-50 p-3">
                  <p className="font-semibold">
                    {a.title || a.eventTitle || "Achievement"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dateText(a.issuedOn || a.eventDate)} ·{" "}
                    {a.role || "Awarded"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No awards or certificates recorded yet.
              </p>
            )}
          </div>
        </section>
      </div>
      <p className="pb-4 text-center text-xs text-slate-400">
        <MapPin className="mr-1 inline h-3 w-3" /> Profile data updates as
        school records are added.
      </p>
    </div>
  );
}
