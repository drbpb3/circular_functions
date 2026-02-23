We can also differentiate the inverse circular functions more directly using the definition of a differential.

div>

Using the fact that

\sin(A + B) & = \sin A\cos B + \cos A\sin B

\end{matrix}]</span></p>

and putting (a = \sin A\text{ and }b = \sin B), find

(\sin\left( \sin^{- 1}a + \sin^{- 1}b \right)) in terms of (a) and (b) without using sin or cos in your expression.

Hence find

[\sin^{- 1}a + \sin^{- 1}b]

div>

div>

\sin(A + B) & = \sin A\cos B + \cos A\sin B \

\Rightarrow \sin(\sin^{- 1}a + \sin^{- 1}b) & = \sin(\sin^{- 1}a)\cos(\sin^{- 1}b) + \cos(\sin^{- 1}a)\sin(\sin^{- 1}b) \

& = a\sqrt{1 - b^{2}} + b\sqrt{1 - a^{2}} \

\Rightarrow \sin^{- 1}a + \sin^{- 1}b & = \sin^{- 1}\left( a\sqrt{1 - b^{2}} + b\sqrt{1 - a^{2}} \right)

\end{matrix}]</span></p>

Now find

[\sin\left( \sin^{- 1}(x + h) - \sin^{- 1}x \right)]

and use this to find

[\lim_{h \rightarrow 0}\frac{\sin\left( \sin^{- 1}(x + h) - \sin^{- 1}x \right)}{h}]

Put (\theta(h) = \sin\left( \sin^{- 1}(x + h) - \sin^{- 1}x \right)) and find

[\lim_{h \rightarrow 0}\frac{\sin^{- 1}\theta(h)}{\theta(h)}]

Hence find

[\lim_{h \rightarrow 0}\frac{\sin^{- 1}\theta(h)}{h}]

Now put (f(x) = \sin^{- 1}x).

Find (f'(x)) and (\frac{d}{dx}\sin^{- 1}x)

\frac{(x + h)\sqrt{1 - x^{2}} - x\sqrt{1 - (x + h)^{2}}}{h} & = \sqrt{1 - x^{2}} + \frac{x\sqrt{1 - x^{2}} - x\sqrt{1 - (x + h)^{2}}}{h} \

& = \sqrt{1 - x^{2}} + x\frac{\sqrt{1 - x^{2}} - \sqrt{1 - (x + h)^{2}}}{h} \

& = \sqrt{1 - x^{2}} + x\frac{\left( 1 - x^{2} - \left( 1 - (x + h)^{2} \right) \right)}{h\left( \sqrt{1 - x^{2}} + \sqrt{1 - (x + h)^{2}} \right)} \

& = \sqrt{1 - x^{2}} + x\frac{2xh + h^{2}}{h\left( \sqrt{1 - x^{2}} + \sqrt{1 - (x + h)^{2}} \right)} \

& \rightarrow \sqrt{1 - x^{2}} + x\frac{2x}{2\sqrt{1 - x^{2}}}\text{as}h \rightarrow 0 \

& = \sqrt{1 - x^{2}} + \frac{x^{2}}{\sqrt{1 - x^{2}}} \

& = \frac{1}{\sqrt{1 - x^{2}}}

\end{matrix}]</span></p>

f(x) & = \sin^{- 1}x \

f'(x) & = \lim_{h \rightarrow 0}\frac{\sin^{- 1}(x + h) - \sin^{- 1}x}{h} \

& = \lim_{h \rightarrow 0}\frac{\sin^{- 1}\left( (x + h)\sqrt{1 - x^{2}} - x\sqrt{1 - (x + h)^{2}} \right)}{h} \

& = \lim_{h \rightarrow 0}\frac{\theta(h)}{h} \times \frac{\sin^{- 1}\theta(h)}{\theta(h)} \

& \text{where}\theta(h) = (x + h)\sqrt{1 - x^{2}} - x\sqrt{1 - (x + h)^{2}} \

& = \lim_{h \rightarrow 0}\frac{\theta(h)}{h}

\end{matrix}]</span></p>

& \lim_{h \rightarrow 0}\frac{(x + h)\sqrt{1 - x^{2}} - x\sqrt{1 - (x + h)^{2}}}{h} = \frac{1}{\sqrt{1 - x^{2}}} \

\Rightarrow & \lim_{h \rightarrow 0}\frac{\theta(h)}{h} = \frac{1}{\sqrt{1 - x^{2}}} \

\Rightarrow & f'(x) = \frac{1}{\sqrt{1 - x^{2}}}

\end{matrix}]</span></p>

div>

