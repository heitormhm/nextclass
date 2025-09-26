import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Mock databases for autocomplete
const mockExams = [
  'Hemograma completo',
  'Eletrocardiograma (ECG)', 
  'Raio-X de tórax',
  'Glicemia de jejum',
  'Colesterol total e frações',
  'Ecocardiograma',
  'Teste ergométrico',
  'Ureia e creatinina'
];

const mockMedications = [
  'Losartana',
  'Metformina', 
  'Salbutamol',
  'Amoxicilina',
  'Atenolol',
  'Sinvastatina',
  'Omeprazol',
  'Aspirina'
];

interface MedicalConductData {
  exams: string[];
  medications: { name: string; dosage?: string }[];
  orientations: string;
}

interface MedicalConductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MedicalConductData) => void;
}

export const MedicalConductModal: React.FC<MedicalConductModalProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [examInput, setExamInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [orientations, setOrientations] = useState('');
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<{ name: string; dosage?: string }[]>([]);
  const [examSuggestions, setExamSuggestions] = useState<string[]>([]);
  const [medicationSuggestions, setMedicationSuggestions] = useState<string[]>([]);
  const [editingMedication, setEditingMedication] = useState<number | null>(null);
  const [dosageInput, setDosageInput] = useState('');

  const handleExamInputChange = (value: string) => {
    setExamInput(value);
    if (value.length > 1) {
      const suggestions = mockExams.filter(exam =>
        exam.toLowerCase().includes(value.toLowerCase())
      );
      setExamSuggestions(suggestions);
    } else {
      setExamSuggestions([]);
    }
  };

  const handleMedicationInputChange = (value: string) => {
    setMedicationInput(value);
    if (value.length > 1) {
      const suggestions = mockMedications.filter(med =>
        med.toLowerCase().includes(value.toLowerCase())
      );
      setMedicationSuggestions(suggestions);
    } else {
      setMedicationSuggestions([]);
    }
  };

  const addExam = (exam: string) => {
    if (!selectedExams.includes(exam)) {
      setSelectedExams([...selectedExams, exam]);
    }
    setExamInput('');
    setExamSuggestions([]);
  };

  const addMedication = (medication: string) => {
    if (!selectedMedications.some(med => med.name === medication)) {
      setSelectedMedications([...selectedMedications, { name: medication }]);
    }
    setMedicationInput('');
    setMedicationSuggestions([]);
  };

  const removeExam = (exam: string) => {
    setSelectedExams(selectedExams.filter(e => e !== exam));
  };

  const removeMedication = (index: number) => {
    setSelectedMedications(selectedMedications.filter((_, i) => i !== index));
  };

  const editMedicationDosage = (index: number) => {
    setEditingMedication(index);
    setDosageInput(selectedMedications[index].dosage || '');
  };

  const saveMedicationDosage = () => {
    if (editingMedication !== null) {
      const updated = [...selectedMedications];
      updated[editingMedication].dosage = dosageInput;
      setSelectedMedications(updated);
      setEditingMedication(null);
      setDosageInput('');
    }
  };

  const handleSave = () => {
    const data: MedicalConductData = {
      exams: selectedExams,
      medications: selectedMedications,
      orientations
    };
    onSave(data);
    
    // Reset form
    setExamInput('');
    setMedicationInput('');
    setOrientations('');
    setSelectedExams([]);
    setSelectedMedications([]);
    setExamSuggestions([]);
    setMedicationSuggestions([]);
    setEditingMedication(null);
    setDosageInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Conduta Médica</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Exames Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Exames</label>
            <div className="relative">
              <Input
                value={examInput}
                onChange={(e) => handleExamInputChange(e.target.value)}
                placeholder="Digite para buscar exames..."
                className="mb-2"
              />
              
              {examSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {examSuggestions.map((exam, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => addExam(exam)}
                    >
                      {exam}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedExams.map((exam, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {exam}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeExam(exam)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Medicações Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Medicações</label>
            <div className="relative">
              <Input
                value={medicationInput}
                onChange={(e) => handleMedicationInputChange(e.target.value)}
                placeholder="Digite para buscar medicações..."
                className="mb-2"
              />
              
              {medicationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {medicationSuggestions.map((med, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => addMedication(med)}
                    >
                      {med}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedMedications.map((medication, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => editMedicationDosage(index)}
                >
                  {medication.name}
                  {medication.dosage && (
                    <span className="text-muted-foreground">| {medication.dosage}</span>
                  )}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMedication(index);
                    }}
                  />
                </Badge>
              ))}
            </div>

            {editingMedication !== null && (
              <div className="mt-3 p-3 border rounded-md">
                <label className="text-sm font-medium mb-1 block">
                  Dosagem para {selectedMedications[editingMedication].name}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={dosageInput}
                    onChange={(e) => setDosageInput(e.target.value)}
                    placeholder="Ex: 50mg, 1x/dia"
                    className="flex-1"
                  />
                  <Button onClick={saveMedicationDosage} size="sm">
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingMedication(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Orientações Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Orientações</label>
            <Textarea
              value={orientations}
              onChange={(e) => setOrientations(e.target.value)}
              placeholder="Digite as orientações para o paciente..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Adicionar na Anamnese
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};