|-(a+0')*(a+0')=a*a+0''*a+0'

!!A->A
0=0->0=0->0=0
a=b->a'=b'

// template_1.proof:
|- @a@b(a=b->b=a)

// template_2.proof:
@a@b(a=b->b=a) 
|- @a(a+0'=a')

// template_3.proof:
@a@b(a=b->b=a)
@a(a+0'=a') 
|- @t(t'=t+0')

// template_4.proof:
|- t=r->t+s=r+s

// template_5.proof:
|- t*r=r*t

// template_6.proof:
|- t=r->t*s=r*s

// template_7.proof:
a+0'=a'
@t@r@s(t=r->t*s=r*s)
@a@b(a=b->b=a)
@t@s(t*s=s*t)
|- @a((a+0')*(a+0')=a'*a')

// template_8.proof:
|- x+y=y+x

// template_9.proof:
|- x+(y+z)=(x+y)+z

// template_10.proof:
@a@b(a*b')=(a*b+a)
@t@s(t*s=s*t)
@t@r@s(t=r->t+s=r+s)
@a@b(a=b->b=a)
@t@s(t+s=s+t)
@s(a*a+s=s+a*a)->(a*a+a+a'=a+a'+a*a)
@a@b(a+b'=(a+b)')
@t(t'=t+0')
x+y=y+x
@x@y((x+y)=(y+x))->@y((a+a'+y)=(y+a+a'))
@a@b@c(a=b->a=c->b=c)
@t@s(t+s=s+t)->@s(a+a+0'+s=s+a+a+0')
|- a'*a'=a*a+a+a+0'

// template_11.proof:
@a@b(a=b->b=a)
a'*a'=(a+0')*(a+0')
a'*a'=a*a+a+a+0'
|- (a+0')*(a+0')=a*a+a+a+0'
