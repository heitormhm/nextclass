// Internship Dashboard - Fixed Link import issue
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Heart, ChevronDown, ChevronLeft, ChevronRight, Eye, MapPin, Calendar, Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';

interface Annotation {
  id: string;
  date: string;
  case: string;
  annotation: string;
  location: string;
  specialty: string;
  isFavorite: boolean;
  patientAge: number;
  patientGender: 'M' | 'F';
}

const InternshipDashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all-dates');
  const [locationFilter, setLocationFilter] = useState('all-locations');
  const [specialtyFilter, setSpecialtyFilter] = useState('all-specialties');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<keyof Annotation>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const itemsPerPage = 5;

  // Static annotation data
  const staticAnnotations: Annotation[] = [
    {
      id: '1',
      date: '2024-03-15',
      case: 'Análise de tensão em viga metálica',
      annotation: 'Estrutura apresentou tensões críticas no ponto central (280 MPa). Verificação de deflexão L/350 atendida. Recomenda-se reforço nas soldas.',
      location: 'Construtora Alfa - Setor de Estruturas',
      specialty: 'Engenharia Civil',
      isFavorite: true,
      patientAge: 0,
      patientGender: 'M'
    },
    {
      id: '2',
      date: '2024-03-12',
      case: 'Sistema hidráulico sob pressão elevada',
      annotation: 'Pressão de 18 bar detectada no sistema, acima do projeto (15 bar). Válvulas de alívio ajustadas. Sistema operacional.',
      location: 'Indústria TechFlow',
      specialty: 'Engenharia Mecânica',
      isFavorite: false,
      patientAge: 0,
      patientGender: 'F'
    },
    {
      id: '3',
      date: '2024-03-10',
      case: 'Vibração em equipamento rotativo',
      annotation: 'Oscilação de 8mm/s detectada em motor principal. Sistema em monitoramento contínuo. Avaliar necessidade de balanceamento.',
      location: 'Usina Hidrelétrica Delta',
      specialty: 'Engenharia Mecânica',
      isFavorite: true,
      patientAge: 0,
      patientGender: 'M'
    },
    {
      id: '4',
      date: '2024-03-08',
      case: 'Falha em circuito de controle',
      annotation: 'Curto-circuito no sistema de controle principal. Manutenção de urgência realizada. Substituição de componente CD. Sistema restabelecido.',
      location: 'Fábrica AutoParts',
      specialty: 'Engenharia Elétrica',
      isFavorite: true,
      patientAge: 0,
      patientGender: 'M'
    },
    {
      id: '5',
      date: '2024-03-05',
      case: 'Análise de eficiência energética',
      annotation: 'Consumo energético 25% acima do previsto. Identificado problema no isolamento térmico. Recomendada substituição de isolantes.',
      location: 'Edifício Comercial Centro',
      specialty: 'Engenharia Civil',
      isFavorite: false,
      patientAge: 0,
      patientGender: 'F'
    },
    {
      id: '6',
      date: '2024-03-03',
      case: 'Inspeção de fundações profundas',
      annotation: 'Capacidade de carga verificada (800 kN). Recalques dentro do previsto (12mm). Necessário monitoramento contínuo.',
      location: 'Construtora Mega Towers',
      specialty: 'Engenharia Civil',
      isFavorite: false,
      patientAge: 0,
      patientGender: 'F'
    },
    {
      id: '7',
      date: '2024-03-01',
      case: 'Análise de processo químico',
      annotation: 'Taxa de conversão 78%, abaixo da meta (85%). Temperatura de reator ajustada. Catalisador em substituição programada.',
      location: 'Indústria Química Polimex',
      specialty: 'Engenharia Química',
      isFavorite: false,
      patientAge: 0,
      patientGender: 'M'
    },
    {
      id: '8',
      date: '2024-02-28',
      case: 'Falha em transformador elétrico',
      annotation: 'Sobreaquecimento detectado (95°C), limite 80°C. Carga redistribuída. Transformador em manutenção preventiva.',
      location: 'Subestação Industrial Norte',
      specialty: 'Engenharia Elétrica',
      isFavorite: true,
      patientAge: 0,
      patientGender: 'F'
    }
  ];

  // Get unique values for filter options
  const uniqueDates = [...new Set(staticAnnotations.map(a => a.date))].sort().reverse();
  const uniqueLocations = [...new Set(staticAnnotations.map(a => a.location))].sort();
  const uniqueSpecialties = [...new Set(staticAnnotations.map(a => a.specialty))].sort();

  // Filtered and sorted data
  const filteredAndSortedAnnotations = useMemo(() => {
    let filtered = staticAnnotations.filter(annotation => {
      const matchesSearch = 
        annotation.case.toLowerCase().includes(searchQuery.toLowerCase()) ||
        annotation.annotation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        annotation.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        annotation.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = !dateFilter || dateFilter === 'all-dates' || annotation.date === dateFilter;
      const matchesLocation = !locationFilter || locationFilter === 'all-locations' || annotation.location === locationFilter;
      const matchesSpecialty = !specialtyFilter || specialtyFilter === 'all-specialties' || annotation.specialty === specialtyFilter;
      const matchesFavorites = !showFavoritesOnly || annotation.isFavorite;

      return matchesSearch && matchesDate && matchesLocation && matchesSpecialty && matchesFavorites;
    });

    // Sort data
    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        const aNum = aValue ? 1 : 0;
        const bNum = bValue ? 1 : 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      return 0;
    });

    return filtered;
  }, [staticAnnotations, searchQuery, dateFilter, locationFilter, specialtyFilter, showFavoritesOnly, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAnnotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAnnotations = filteredAndSortedAnnotations.slice(startIndex, endIndex);

  const handleSort = (column: keyof Annotation) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all-dates');
    setLocationFilter('all-locations');
    setSpecialtyFilter('all-specialties');
    setShowFavoritesOnly(false);
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Meu Estágio</h1>
                <p className="text-foreground-muted mt-1">
                  Histórico de anotações e estudos de caso
                </p>
              </div>
              <Button 
                className="bg-primary hover:bg-primary-light"
                onClick={() => navigate('/internship/setup')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Gravar Novo Cenário
              </Button>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Search and Favorites */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-muted h-4 w-4" />
                      <Input
                        placeholder="Buscar por caso, anotação, local ou especialidade..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant={showFavoritesOnly ? "default" : "outline"}
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className={cn(
                        "transition-all duration-200",
                        showFavoritesOnly && "bg-red-500 hover:bg-red-600 text-white"
                      )}
                    >
                      <Heart className={cn(
                        "h-4 w-4 mr-2",
                        showFavoritesOnly ? "fill-current" : ""
                      )} />
                      Favoritos
                    </Button>
                  </div>

                  {/* Filter Dropdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filtrar por Data" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="all-dates">Todas as datas</SelectItem>
                          {uniqueDates.map(date => (
                            <SelectItem key={date} value={date}>
                              {formatDate(date)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Local da Consulta" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="all-locations">Todos os locais</SelectItem>
                          {uniqueLocations.map(location => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Especialidade" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="all-specialties">Todas as áreas</SelectItem>
                          {uniqueSpecialties.map(specialty => (
                            <SelectItem key={specialty} value={specialty}>
                              {specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(searchQuery || (dateFilter && dateFilter !== 'all-dates') || (locationFilter && locationFilter !== 'all-locations') || (specialtyFilter && specialtyFilter !== 'all-specialties') || showFavoritesOnly) && (
                    <div className="flex justify-end">
                      <Button variant="ghost" onClick={clearFilters} className="text-foreground-muted">
                        Limpar filtros
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Results Summary */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-foreground-muted">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedAnnotations.length)} de {filteredAndSortedAnnotations.length} resultados
              </p>
            </div>

            {/* Desktop Table */}
            <Card className="border-0 shadow-sm hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-2">
                          Data
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortColumn === 'date' && sortDirection === 'desc' && "rotate-180"
                          )} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleSort('case')}
                      >
                        <div className="flex items-center gap-2">
                          Caso
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortColumn === 'case' && sortDirection === 'desc' && "rotate-180"
                          )} />
                        </div>
                      </TableHead>
                      <TableHead>Anotação</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleSort('location')}
                      >
                        <div className="flex items-center gap-2">
                          Local da Consulta
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            sortColumn === 'location' && sortDirection === 'desc' && "rotate-180"
                          )} />
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAnnotations.map((annotation) => (
                      <TableRow key={annotation.id} className="hover:bg-accent/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-foreground-muted" />
                            {formatDate(annotation.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">
                              {annotation.case}
                              {annotation.isFavorite && (
                                <Heart className="inline ml-2 h-4 w-4 text-red-500 fill-current" />
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {annotation.specialty}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-foreground-muted line-clamp-2">
                            {annotation.annotation}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-foreground-muted" />
                            <span className="text-sm">{annotation.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/internship/review/${annotation.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {currentAnnotations.map((annotation) => (
                <Card key={annotation.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-foreground line-clamp-1">
                            {annotation.case}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-foreground-muted">
                            <Calendar className="h-3 w-3" />
                            {formatDate(annotation.date)}
                          </div>
                        </div>
                        {annotation.isFavorite && (
                          <Heart className="h-4 w-4 text-red-500 fill-current flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-sm text-foreground-muted line-clamp-2">
                        {annotation.annotation}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Badge variant="secondary" className="text-xs">
                            {annotation.specialty}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-foreground-muted">
                            <MapPin className="h-3 w-3" />
                            {annotation.location}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/internship/review/${annotation.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-foreground-muted">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {filteredAndSortedAnnotations.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-secondary flex items-center justify-center">
                    <Briefcase className="h-8 w-8 text-foreground-muted" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma anotação encontrada</h3>
                  <p className="text-foreground-muted mb-4">
                    Não há anotações que correspondam aos filtros aplicados.
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </MainLayout>
  );
};

export default InternshipDashboard;