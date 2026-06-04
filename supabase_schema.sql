-- Create Finance Tracker Table
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Finance Tracker
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own finance transactions"
    ON finance_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own finance transactions"
    ON finance_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own finance transactions"
    ON finance_transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own finance transactions"
    ON finance_transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'PAID')),
    notes TEXT,
    subtotal NUMERIC NOT NULL,
    tax_rate NUMERIC NOT NULL,
    tax_amount NUMERIC NOT NULL,
    grand_total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
    ON invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
    ON invoices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
    ON invoices FOR DELETE
    USING (auth.uid() = user_id);

-- Create Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL
);

-- Enable RLS for Invoice Items
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Note: We join with invoices to check the user_id for RLS policies
CREATE POLICY "Users can view their own invoice items"
    ON invoice_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

CREATE POLICY "Users can insert their own invoice items"
    ON invoice_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

CREATE POLICY "Users can update their own invoice items"
    ON invoice_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

CREATE POLICY "Users can delete their own invoice items"
    ON invoice_items FOR DELETE
    USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
