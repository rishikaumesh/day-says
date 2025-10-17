import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, LogOut, User, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MoodCalendar from '@/components/MoodCalendar';

interface JournalEntry {
  id: string;
  entry_text: string;
  mood: string;
  reflection: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [journalText, setJournalText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadEntries();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('journal_entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          loadEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading entries:', error);
      return;
    }

    setEntries(data || []);
  };

  const handleSubmit = async () => {
    if (!journalText.trim()) {
      toast({
        title: 'Error',
        description: 'Please write something in your journal',
        variant: 'destructive'
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-mood', {
        body: { journalText, userId: user?.id }
      });

      if (analysisError) throw analysisError;

      const { data: insertData, error: insertError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user?.id,
          entry_text: journalText,
          mood: analysisData.mood.toLowerCase(),
          reflection: analysisData.response
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: 'Entry saved!',
        description: `Mood: ${analysisData.mood}`
      });

      setJournalText('');
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save entry',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete entry',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Entry removed successfully'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mind Mirror</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/insights')}>
              <BarChart3 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Welcome back, {user?.user_metadata?.name || 'there'}!</h2>
            <p className="text-muted-foreground mt-1">How are you feeling today?</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Journal Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="What's on your mind?"
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  className="min-h-[200px]"
                />
                <Button 
                  onClick={handleSubmit} 
                  disabled={isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Save Entry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <MoodCalendar 
          entries={entries.map(e => ({
            id: e.id,
            date: new Date(e.created_at).toISOString().split('T')[0],
            journalText: e.entry_text,
            mood: e.mood.charAt(0).toUpperCase() + e.mood.slice(1),
            response: e.reflection,
            timestamp: e.created_at
          }))}
          onDeleteEntry={handleDeleteEntry}
          onDateSelect={() => {}}
        />
      </main>
    </div>
  );
};

export default Dashboard;