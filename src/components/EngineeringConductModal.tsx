import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Mock databases for autocomplete - Engineering theme
const mockTests = [
  'Análise de Tensão Estrutural',
  'Teste de Circuito Elétrico', 
  'Análise de Fluidos',
  'Teste de Resistência de Materiais',
  'Verificação de Protocolos de Rede',
  'Análise Térmica',
  'Teste de Vibração',
  'Análise de Eficiência Energética'
];

const mockEquipments = [
  'Multímetro Digital',
  'Osciloscópio', 
  'Analisador de Espectro',
  'Fonte de Alimentação',
  'Gerador de Sinais',
  'Protoboard',
  'Soldador Eletrônico',
  'Microcontrolador Arduino'
];

interface EngineeringConductData {
  tests: string[];
  equipment: { name: string; specifications?: string }[];
  instructions: string;
}

interface EngineeringConductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: EngineeringConductData) => void;
}

export const EngineeringConductModal: React.FC<EngineeringConductModalProps> = ({
  open,
  onClose,
  onSave
}) => {
  const [testInput, setTestInput] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<{ name: string; specifications?: string }[]>([]);
  const [testSuggestions, setTestSuggestions] = useState<string[]>([]);
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<string[]>([]);
  const [editingEquipment, setEditingEquipment] = useState<number | null>(null);
  const [specificationsInput, setSpecificationsInput] = useState('');

  const handleTestInputChange = (value: string) => {
    setTestInput(value);
    if (value.length > 1) {
      const suggestions = mockTests.filter(test =>
        test.toLowerCase().includes(value.toLowerCase())
      );
      setTestSuggestions(suggestions);
    } else {
      setTestSuggestions([]);
    }
  };

  const handleEquipmentInputChange = (value: string) => {
    setEquipmentInput(value);
    if (value.length > 1) {
      const suggestions = mockEquipments.filter(equip =>
        equip.toLowerCase().includes(value.toLowerCase())
      );
      setEquipmentSuggestions(suggestions);
    } else {
      setEquipmentSuggestions([]);
    }
  };

  const addTest = (test: string) => {
    if (!selectedTests.includes(test)) {
      setSelectedTests([...selectedTests, test]);
    }
    setTestInput('');
    setTestSuggestions([]);
  };

  const addEquipment = (equipment: string) => {
    if (!selectedEquipment.some(equip => equip.name === equipment)) {
      setSelectedEquipment([...selectedEquipment, { name: equipment }]);
    }
    setEquipmentInput('');
    setEquipmentSuggestions([]);
  };

  const removeTest = (test: string) => {
    setSelectedTests(selectedTests.filter(e => e !== test));
  };

  const removeEquipment = (index: number) => {
    setSelectedEquipment(selectedEquipment.filter((_, i) => i !== index));
  };

  const editEquipmentSpecs = (index: number) => {
    setEditingEquipment(index);
    setSpecificationsInput(selectedEquipment[index].specifications || '');
  };

  const saveEquipmentSpecs = () => {
    if (editingEquipment !== null) {
      const updated = [...selectedEquipment];
      updated[editingEquipment].specifications = specificationsInput;
      setSelectedEquipment(updated);
      setEditingEquipment(null);
      setSpecificationsInput('');
    }
  };

  const handleSave = () => {
    const data: EngineeringConductData = {
      tests: selectedTests,
      equipment: selectedEquipment,
      instructions
    };
    onSave(data);
    
    // Reset form
    setTestInput('');
    setEquipmentInput('');
    setInstructions('');
    setSelectedTests([]);
    setSelectedEquipment([]);
    setTestSuggestions([]);
    setEquipmentSuggestions([]);
    setEditingEquipment(null);
    setSpecificationsInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Conduta de Engenharia</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Testes Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Testes</label>
            <div className="relative">
              <Input
                value={testInput}
                onChange={(e) => handleTestInputChange(e.target.value)}
                placeholder="Digite para buscar testes..."
                className="mb-2"
              />
              
              {testSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {testSuggestions.map((test, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => addTest(test)}
                    >
                      {test}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTests.map((test, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {test}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTest(test)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Equipamentos Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Equipamentos</label>
            <div className="relative">
              <Input
                value={equipmentInput}
                onChange={(e) => handleEquipmentInputChange(e.target.value)}
                placeholder="Digite para buscar equipamentos..."
                className="mb-2"
              />
              
              {equipmentSuggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {equipmentSuggestions.map((equip, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => addEquipment(equip)}
                    >
                      {equip}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedEquipment.map((equipment, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={() => editEquipmentSpecs(index)}
                >
                  {equipment.name}
                  {equipment.specifications && (
                    <span className="text-muted-foreground">| {equipment.specifications}</span>
                  )}
                  <X
                    className="h-3 w-3 cursor-pointer ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEquipment(index);
                    }}
                  />
                </Badge>
              ))}
            </div>

            {editingEquipment !== null && (
              <div className="mt-3 p-3 border rounded-md">
                <label className="text-sm font-medium mb-1 block">
                  Especificações para {selectedEquipment[editingEquipment].name}
                </label>
                <div className="flex gap-2">
                  <Input
                    value={specificationsInput}
                    onChange={(e) => setSpecificationsInput(e.target.value)}
                    placeholder="Ex: 12V, 2A"
                    className="flex-1"
                  />
                  <Button onClick={saveEquipmentSpecs} size="sm">
                    Salvar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingEquipment(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Instruções Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Instruções</label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Digite as instruções para o projeto..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Adicionar no Projeto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};