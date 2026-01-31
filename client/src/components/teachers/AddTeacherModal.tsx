import React from "react";
import TeacherModal from "./TeacherModal";

interface AddTeacherModalProps {
  onSuccess?: () => void;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ onSuccess }) => {
  return <TeacherModal mode="add" onSuccess={onSuccess} />;
};

export default AddTeacherModal;
