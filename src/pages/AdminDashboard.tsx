import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Users, Shield, Copy, Download, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quantity, setQuantity] = useState('5');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [notes, setNotes] = useState('');

  // Buscar códigos gerados
  const { data: codes, isLoading: isLoadingCodes, refetch: refetchCodes } = useQuery({
    queryKey: ['teacher-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_access_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const totalCodes = codes?.length || 0;
      const usedCodes = codes?.filter(c => c.is_used).length || 0;
      const availableCodes = totalCodes - usedCodes;
      
      return {
        total: totalCodes,
        used: usedCodes,
        available: availableCodes
      };
    },
    enabled: !!codes
  });

  const handleGenerateCodes = async () => {
    if (!quantity || parseInt(quantity) < 1) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Quantidade deve ser pelo menos 1'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-teacher-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            quantity: parseInt(quantity),
            expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
            notes: notes || null
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao gerar códigos');
      }

      toast({
        title: '✅ Códigos Gerados!',
        description: `${result.codes.length} códigos criados com sucesso.`
      });

      // Limpar formulário
      setQuantity('5');
      setExpiresInDays('30');
      setNotes('');
      
      // Recarregar lista de códigos
      refetchCodes();
    } catch (error: any) {
      console.error('Erro ao gerar códigos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message || 'Falha ao gerar códigos'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'Código copiado para a área de transferência'
    });
  };

  const exportToCSV = () => {
    if (!codes || codes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Nenhum código para exportar'
      });
      return;
    }

    const headers = ['Código', 'Status', 'Criado em', 'Expira em', 'Notas'];
    const rows = codes.map(code => [
      code.code,
      code.is_used ? 'Usado' : 'Disponível',
      new Date(code.created_at).toLocaleDateString('pt-BR'),
      code.expires_at ? new Date(code.expires_at).toLocaleDateString('pt-BR') : 'Nunca',
      code.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Exportado!',
      description: 'Códigos exportados para CSV'
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Painel de Administração</h1>
          <p className="text-muted-foreground">Gerenciar códigos de acesso e sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Códigos</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Códigos Usados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.used || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.available || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Gerador de Códigos */}
        <Card>
          <CardHeader>
            <CardTitle>Gerar Códigos de Acesso</CardTitle>
            <CardDescription>
              Crie novos códigos para professores acessarem o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantos códigos gerar?"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expires">Expira em (dias)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="Deixe vazio para nunca expirar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Lote para novos professores de Medicina"
                rows={3}
              />
            </div>

            <Button 
              onClick={handleGenerateCodes}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Gerar Códigos
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tabela de Códigos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Códigos Gerados</CardTitle>
                <CardDescription>Lista de todos os códigos de acesso</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCSV}
                disabled={!codes || codes.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCodes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : codes && codes.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono">{code.code}</TableCell>
                        <TableCell>
                          {code.is_used ? (
                            <Badge variant="secondary">Usado</Badge>
                          ) : (
                            <Badge>Disponível</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(code.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {code.expires_at 
                            ? new Date(code.expires_at).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {code.notes || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum código gerado ainda. Use o formulário acima para criar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
