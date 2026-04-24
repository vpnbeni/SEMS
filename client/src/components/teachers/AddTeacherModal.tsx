import React from "react";
import TeacherModal from "./TeacherModal";

interface AddTeacherModalProps {
  onSuccess?: (teacher?: any) => void;
  entityLabelSingular?: string;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ onSuccess, entityLabelSingular }) => {
  return <TeacherModal mode="add" onSuccess={onSuccess} entityLabelSingular={entityLabelSingular} />;
};

export default AddTeacherModal;
