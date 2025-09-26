import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, Users, MapPin, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Patient {
  id: number;
  cpf: string;
  fullName: string;
  birthDate: string;
  gender: string;
}

interface Location {
  id: number;
  name: string;
}

interface PatientIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PatientIntakeModal: React.FC<PatientIntakeModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = search, 2 = form, 3 = location
  const [searchQuery, setSearchQuery] = useState('');
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [manualDateInput, setManualDateInput] = useState('');
  const [patientData, setPatientData] = useState<Patient>({
    id: 0,
    cpf: '',
    fullName: '',
    birthDate: '',
    gender: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);

  // Mock patient database
  const mockPatientDB: Patient[] = [
    { id: 1, cpf: '111.222.333-44', fullName: 'Carlos Silva', birthDate: '1979-05-15', gender: 'Masculino' },
    { id: 2, cpf: '555.666.777-88', fullName: 'Ana Costa', birthDate: '1990-11-22', gender: 'Feminino' },
    { id: 3, cpf: '999.888.777-66', fullName: 'José Santos', birthDate: '1985-08-10', gender: 'Masculino' },
    { id: 4, cpf: '444.333.222-11', fullName: 'Maria Oliveira', birthDate: '1995-03-25', gender: 'Feminino' }
  ];

  // Mock locations database
  const mockLocations: Location[] = [
    { id: 1, name: 'Hospital Universitário Clemente de Faria' },
    { id: 2, name: 'Clínica Santa Clara' },
    { id: 3, name: 'UBS Central' },
    { id: 4, name: 'Hospital São Lucas' },
    { id: 5, name: 'Clínica Médica Integrada' },
    { id: 6, name: 'UBS Vila Nova' }
  ];

  const handleSearch = () => {
    const cleanQuery = searchQuery.replace(/\D/g, ''); // Remove non-digits for CPF search
    const patient = mockPatientDB.find(p => 
      p.cpf.replace(/\D/g, '') === cleanQuery || 
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (patient) {
      setFoundPatient(patient);
      setPatientData(patient);
      setSelectedDate(new Date(patient.birthDate));
      setManualDateInput(format(new Date(patient.birthDate), 'dd/MM/yyyy'));
    } else {
      setFoundPatient(null);
      setPatientData({
        id: 0,
        cpf: '',
        fullName: '',
        birthDate: '',
        gender: ''
      });
      setSelectedDate(undefined);
      setManualDateInput('');
    }
    setShowPatientDropdown(false);
    setStep(2);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      const filtered = mockPatientDB.filter(patient =>
        patient.fullName.toLowerCase().includes(value.toLowerCase()) ||
        patient.cpf.includes(value)
      );
      setFilteredPatients(filtered);
      setShowPatientDropdown(filtered.length > 0);
    } else {
      setFilteredPatients([]);
      setShowPatientDropdown(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setFoundPatient(patient);
    setPatientData(patient);
    setSelectedDate(new Date(patient.birthDate));
    setManualDateInput(format(new Date(patient.birthDate), 'dd/MM/yyyy'));
    setSearchQuery(patient.fullName);
    setShowPatientDropdown(false);
    setStep(2);
  };

  const handleNextToLocation = () => {
    setStep(3);
  };

  const handleProceed = () => {
    // Calculate age from birth date
    const today = new Date();
    const birth = new Date(patientData.birthDate);
    const age = today.getFullYear() - birth.getFullYear() - 
      (today.getMonth() < birth.getMonth() || 
       (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);

    const patientWithAge = {
      ...patientData,
      age
    };

    const locationData = selectedLocation || { id: 0, name: locationQuery };

    onClose();
    navigate('/record-scenario', { state: { patient: patientWithAge, location: locationData } });
  };

  const handleClose = () => {
    setStep(1);
    setSearchQuery('');
    setFoundPatient(null);
    setFilteredPatients([]);
    setShowPatientDropdown(false);
    setPatientData({
      id: 0,
      cpf: '',
      fullName: '',
      birthDate: '',
      gender: ''
    });
    setSelectedDate(undefined);
    setManualDateInput('');
    setLocationQuery('');
    setSelectedLocation(null);
    setFilteredLocations([]);
    onClose();
  };

  const handleInputChange = (field: keyof Patient, value: string) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setManualDateInput(format(date, 'dd/MM/yyyy'));
      handleInputChange('birthDate', format(date, 'yyyy-MM-dd'));
    }
  };

  const handleManualDateChange = (value: string) => {
    setManualDateInput(value);
    
    // Parse DD/MM/YYYY format
    if (value.length === 10) {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // months are 0-indexed
        const year = parseInt(parts[2]);
        
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= new Date().getFullYear()) {
          const date = new Date(year, month, day);
          setSelectedDate(date);
          handleInputChange('birthDate', format(date, 'yyyy-MM-dd'));
        }
      }
    }
  };

  const handleLocationSearch = (query: string) => {
    setLocationQuery(query);
    if (query.trim()) {
      const filtered = mockLocations.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations([]);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setLocationQuery(location.name);
    setFilteredLocations([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white max-w-[95vw] sm:max-w-md w-full mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {step === 1 ? 'Buscar Projeto' : step === 2 ? 'Dados do Projeto' : 'Local da Análise'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para iniciar a Gravação do Estudo de Caso informe os dados do Projeto
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="search">Código ou Nome do projeto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Digite o CPF ou nome completo..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  className="pl-10 min-h-[44px]"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full text-left px-3 py-3 hover:bg-accent hover:text-accent-foreground text-sm border-b last:border-b-0 min-h-[44px]"
                      >
                        <div className="font-medium">{patient.fullName}</div>
                        <div className="text-xs text-muted-foreground">{patient.cpf}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showPatientDropdown && filteredPatients.length === 0 && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md px-3 py-2">
                    <div className="text-sm text-muted-foreground">Nenhum projeto encontrado</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1 min-h-[48px]">
                Cancelar
              </Button>
              <Button 
                onClick={handleSearch} 
                disabled={!searchQuery.trim()}
                className="flex-1 min-h-[48px]"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Projeto
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            {foundPatient ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Projeto encontrado no sistema
                </p>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 font-medium">
                  Projeto não encontrado. Preencha os dados para cadastro.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="fullName"
                    value={patientData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={!!foundPatient}
                    className="pl-10 min-h-[44px]"
                    placeholder="Nome completo do projeto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={patientData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  disabled={!!foundPatient}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="birthDate"
                      placeholder="DD/MM/YYYY"
                      value={manualDateInput}
                      onChange={(e) => handleManualDateChange(e.target.value)}
                      disabled={!!foundPatient}
                      className="flex-1 min-h-[44px]"
                      maxLength={10}
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0 min-h-[44px] min-w-[44px]"
                          disabled={!!foundPatient}
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          className="p-3 pointer-events-auto"
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero *</Label>
                  <Select
                    value={patientData.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
                    disabled={!!foundPatient}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 min-h-[48px]">
                Voltar
              </Button>
              <Button 
                onClick={handleNextToLocation}
                disabled={!patientData.fullName || !patientData.cpf || !patientData.birthDate || !patientData.gender}
                className="flex-1 min-h-[48px]"
              >
                <Users className="h-4 w-4 mr-2" />
                Próximo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione ou digite o local onde a consulta será realizada
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="location">Local da Consulta *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="location"
                  placeholder="Digite o nome do hospital ou clínica..."
                  value={locationQuery}
                  onChange={(e) => handleLocationSearch(e.target.value)}
                  className="pl-10 min-h-[44px]"
                />
                
                {filteredLocations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredLocations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => handleLocationSelect(location)}
                        className="w-full text-left px-3 py-3 hover:bg-accent hover:text-accent-foreground text-sm min-h-[44px]"
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 min-h-[48px]">
                Voltar
              </Button>
              <Button 
                onClick={handleProceed}
                disabled={!locationQuery.trim()}
                className="flex-1 min-h-[48px]"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Registrar e Prosseguir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PatientIntakeModal;