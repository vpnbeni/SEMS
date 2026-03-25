import React from "react";
import TeacherModal from "./TeacherModal";

interface EditTeacherModalProps {
  onSuccess?: (teacher?: any) => void;
}

const EditTeacherModal: React.FC<EditTeacherModalProps> = ({ onSuccess }) => {
  return <TeacherModal mode="edit" onSuccess={onSuccess} />;
};

export default EditTeacherModal;
