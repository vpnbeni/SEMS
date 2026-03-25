import React from "react";
import TeacherModal from "./TeacherModal";

interface AddTeacherModalProps {
  onSuccess?: (teacher?: any) => void;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ onSuccess }) => {
  return <TeacherModal mode="add" onSuccess={onSuccess} />;
};

export default AddTeacherModal;
