'use server'; // enable server actions
 
import { z } from 'zod'; // used for easier type definitions and validation
import { revalidatePath } from 'next/cache'; // used for revalidating the cache after a server action
import { redirect } from 'next/navigation'; // used for redirecting the user after a server action
import postgres from 'postgres'; // postgres SQL actions
 
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
}); // type def
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
 
export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  }); // validate the form data using the schema defined above
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    // print created object to console for debugging purposes
    console.log({ customerId, amount, status });

    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `; // insert the new invoice into the postgres database

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}